import MockAdapter from 'axios-mock-adapter';
import API, { login, getTeamAnalytics } from './api';

describe('API smoke: login and dashboard fetch', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(API);
    localStorage.clear();
  });

  afterEach(() => {
    mock.restore();
    localStorage.clear();
  });

  it('logs in and fetches dashboard analytics with auth token', async () => {
    mock.onPost('/auth/login').reply(200, {
      token: 'test-token-123',
      user: {
        id: 'u1',
        name: 'Manager One',
        email: 'manager@test.dev',
        role: 'Manager',
      },
    });

    mock.onGet('/analytics/team').reply((config) => {
      if (config.headers?.Authorization !== 'Bearer test-token-123') {
        return [401, { message: 'Unauthorized' }];
      }

      return [200, {
        summary: {
          totalTasks: 3,
          teamSize: 2,
        },
      }];
    });

    const loginResponse = await login({ email: 'manager@test.dev', password: 'secret123' });
    expect(loginResponse.data.token).toBe('test-token-123');

    localStorage.setItem('token', loginResponse.data.token);

    const dashboardResponse = await getTeamAnalytics();
    expect(dashboardResponse.data.summary.totalTasks).toBe(3);
    expect(dashboardResponse.data.summary.teamSize).toBe(2);
  });
});
