import { ExecutionContext } from '@nestjs/common';
import { defer, of } from 'rxjs';
import { RequestContext } from '../context/request-context';
import { AuditUserInterceptor } from './audit-user.interceptor';

describe('AuditUserInterceptor', () => {
  it('keeps the authenticated user id in async context while the handler runs', async () => {
    const request = { user: { sub: 42 } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const next = {
      handle: jest.fn(() =>
        defer(() => of(RequestContext.getUserId())),
      ),
    };
    const interceptor = new AuditUserInterceptor();

    await expect(
      new Promise((resolve, reject) => {
        interceptor.intercept(context, next).subscribe({
          next: resolve,
          error: reject,
        });
      }),
    ).resolves.toBe(42);
  });
});
