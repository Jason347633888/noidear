import request from './request';

export interface LdapLoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
}

// LDAP/OAuth2 SSO 认证 - 密码通过 HTTPS 加密传输，不记录到日志
export default {
  ldapLogin(data: LdapLoginDto): Promise<LoginResponse> {
    return request.post('/auth/sso/ldap', data);
  },

  getOAuth2RedirectUrl(provider: string): string {
    return `/api/v1/auth/sso/oauth2/redirect?provider=${provider}`;
  },
};
