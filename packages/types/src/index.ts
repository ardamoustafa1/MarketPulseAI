import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  role: z.enum(["user", "admin"]),
});

export type User = z.infer<typeof UserSchema>;

export const AssetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  type: z.enum(["crypto", "fiat", "metal"]),
});

export type Asset = z.infer<typeof AssetSchema>;
