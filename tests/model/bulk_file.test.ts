import { randomUUID } from 'crypto';
import { BulkFile } from '../../src';
import { TestHelper } from '../helper';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('一括送信用CSVのアップロード先URLを発行できる', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();

    const id = randomUUID();
    server.use(
        http.post(requestOptions.getBaseUri() + `/messages/bulks/files`, async () =>
            HttpResponse.json({
                id: id,
                object: 'bulk_file',
                created_at: '2024-03-01T00:00:00+09:00',
                expires_at: '2024-03-01T00:00:00+09:00',
            })
        )
    );

    const bulkFile = await BulkFile.create(requestOptions);
    expect(bulkFile.id).toBe(id);
});

test('urlを出力できる', () => {
    const value = 'https://example.com/';
    const bulkFile = new BulkFile();
    bulkFile.setProperty('url', value);
    expect(bulkFile.url).toBe(value);
});

test('createdAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const bulkFile = new BulkFile();
    bulkFile.setProperty('created_at', value);
    expect(bulkFile.createdAt).toEqual(new Date(value));
});

test('expiresAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const bulkFile = new BulkFile();
    bulkFile.setProperty('expires_at', value);
    expect(bulkFile.expiresAt).toEqual(new Date(value));
});
