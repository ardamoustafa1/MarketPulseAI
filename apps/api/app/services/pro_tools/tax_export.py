"""
Tax report export.

Wraps `portfolio_powers.tax_lots.build_tax_report` and produces:

  * a normalised row list suitable for tables, PDF, or email
  * a ready-to-download CSV body (comma separated, RFC 4180 style)
  * a short locale-aware disclosure

A full PDF is produced client-side (or via the report worker) using the same
payload — keeping the API contract future-proof without adding a heavyweight
dependency inside the FastAPI app.
"""

from __future__ import annotations

import csv
import io
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.pro_tools import TaxExportPayload, TaxExportRow, TaxExportView
from app.services.portfolio_powers.tax_lots import build_tax_report

_DISCLOSURE_TR = (
    "Bu rapor bilgilendirme amaçlıdır ve resmi vergi beyannamesi yerine geçmez. "
    "Kar-zarar hesapları, kullanıcı tarafından girilen işlemler baz alınarak "
    "FIFO/LIFO yöntemiyle üretilmiştir. Yetkili mali müşavir ile teyit ediniz."
)


def _rows_from_report(report) -> list[TaxExportRow]:
    rows: list[TaxExportRow] = []
    method = report.method
    for event in report.realized_events:
        rows.append(
            TaxExportRow(
                symbol=event.symbol,
                acquired_on=None,
                disposed_on=event.sold_at,
                quantity=event.quantity,
                cost_basis=event.cost_basis,
                proceeds=event.proceeds,
                realized_pnl=event.realized_pnl,
                lot_age_days=None,
                method=method,
            )
        )
    return rows


def _rows_from_open_lots(report, include_unrealized: bool) -> list[TaxExportRow]:
    if not include_unrealized:
        return []
    out: list[TaxExportRow] = []
    for lot in report.open_lots:
        out.append(
            TaxExportRow(
                symbol=lot.symbol,
                acquired_on=lot.acquired_at or None,
                disposed_on=None,
                quantity=lot.quantity,
                cost_basis=lot.cost_basis,
                proceeds=None,
                realized_pnl=lot.unrealized_pnl,
                lot_age_days=lot.age_days,
                method=report.method,
            )
        )
    return out


def _as_csv(rows: list[TaxExportRow]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "symbol",
            "acquired_on",
            "disposed_on",
            "quantity",
            "cost_basis",
            "proceeds",
            "realized_pnl",
            "lot_age_days",
            "method",
        ]
    )
    for r in rows:
        writer.writerow(
            [
                r.symbol,
                r.acquired_on or "",
                r.disposed_on or "",
                f"{r.quantity:.8f}",
                f"{r.cost_basis:.2f}",
                "" if r.proceeds is None else f"{r.proceeds:.2f}",
                "" if r.realized_pnl is None else f"{r.realized_pnl:.2f}",
                "" if r.lot_age_days is None else str(r.lot_age_days),
                r.method,
            ]
        )
    return buf.getvalue()


async def build_tax_export(
    db: Session, user: User, payload: TaxExportPayload
) -> TaxExportView:
    report = await build_tax_report(db, user, method=payload.method)

    realized_rows = _rows_from_report(report)
    if payload.tax_year is not None:
        realized_rows = [
            r
            for r in realized_rows
            if r.disposed_on and r.disposed_on.startswith(str(payload.tax_year))
        ]
    unrealized_rows = _rows_from_open_lots(report, payload.include_unrealized)

    rows = realized_rows + unrealized_rows
    csv_body = _as_csv(rows)

    return TaxExportView(
        method=payload.method,
        tax_year=payload.tax_year,
        rows=rows,
        total_realized_pnl=report.total_realized_pnl,
        total_unrealized_pnl=report.total_unrealized_pnl,
        disclosure=_DISCLOSURE_TR,
        csv_body=csv_body,
        generated_at=datetime.now(UTC),
    )
