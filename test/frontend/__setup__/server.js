import { setupServer } from 'msw/node';
import { rest } from 'msw';
import groups from '../__fixtures__/groups';
import plans from '../__fixtures__/plans';
import planCategories from '../__fixtures__/plan_categories';
import { partners, managers, users } from '../__fixtures__/users';
import { settings } from '../__fixtures__/settings';

export const server = setupServer(
  rest.get('/api/groups', (req, res, ctx) => {
    return res(ctx.json(groups));
  }),
  rest.get('/api/plan_categories', (req, res, ctx) => {
    return res(ctx.json(planCategories));
  }),
  rest.get('/api/users', (req, res, ctx) => {
    switch (new URLSearchParams(req.url.search).get('role')) {
      case 'partner':
        return res(ctx.json(partners));
      case 'manager':
        return res(ctx.json(managers));
      default:
        return res(ctx.json(users));
    }
  }),
  rest.get('/api/plans', (req, res, ctx) => {
    return res(ctx.json(plans));
  }),
  rest.post('/api/plans', (req, res, ctx) => {
    return res(ctx.json(req.body));
  }),
  rest.post('/api/users', (req, res, ctx) => {
    /* eslint-disable camelcase */
    const { user: { first_name, last_name, email } } = req.body;
    return res(ctx.status(201), ctx.json({
      id: Math.ceil(Math.random() * 100),
      email,
      profile_attributes: { first_name, last_name }
    }));
    /* eslint-enable camelcase */
  }),
  rest.get('/api/settings/:name', (req, res, ctx) => {
    const setting = settings.find(s => s.name === req.params.name);
    return res(ctx.json({ setting }));
  }),
  rest.get('/api/settings', (req, res, ctx) => {
    const { names } = req.params;
    const foundSettings = settings.filter(name => names.replace(/[[\]']/g, '').split(',').includes(name));
    return res(ctx.json(foundSettings));
  }),
  rest.patch('/api/settings/bulk_update', (req, res, ctx) => {
    return res(ctx.json(req.body));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());