import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.K6_VUS || 10),
  duration: __ENV.K6_DURATION || '45s',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],
  },
};

const API_BASE_URL = __ENV.API_BASE_URL || 'http://127.0.0.1:8000';

export default function () {
  const res = http.get(`${API_BASE_URL}/api/v1/health/readiness`);
  check(res, {
    'readiness status is 200': (r) => r.status === 200,
    'readiness has ready field': (r) => JSON.parse(r.body).ready !== undefined,
  });
  sleep(1);
}
