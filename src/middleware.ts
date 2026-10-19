import { settingsProfileUrl } from '@mairie360/front-kit/shared';
import { createAuthGuard } from '@mairie360/front-kit/guard';
import contract from '../contracts/openapi.json';
export const middleware = createAuthGuard({
  paths: contract.paths,
  frontUrl: () => process.env.MESSAGE_FRONT_URL?.trim() ?? '',
  loginUrl: () => process.env.LOGIN_FRONT_URL?.trim() ?? '',
  profileUrl: () => settingsProfileUrl(process.env.SETTINGS_FRONT_URL),
});
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)", "/openapi.json", "/swagger.json"],
};
