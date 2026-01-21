import axios from 'axios';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as path from 'path';
import {
    BulkMessageCreateParams,
    BulkMessageDownloadParams,
    BulkMessageListMessageParams,
    BulkMessageShowParams,
    BulkMessageService,
    BulkMessageCreateFailedException,
    BulkMessageListMessageRetryLimitExceedException,
    BulkMessageShowRetryLimitExceedException,
    FileDownloadFailedException,
    FileNotFoundException,
} from '../../src';
import { TestHelper } from '../helper';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { randomUUID } from 'crypto';
import { BulkMessageStatus } from '../../src/model';

const server = setupServer();

const id = randomUUID();

beforeAll(() => server.listen());
beforeEach(() => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const params = BulkMessageCreateParams.newBuilder().build();
    const showParams = BulkMessageShowParams.newBuilder().withId(id).build();
    const listMessageParams = BulkMessageListMessageParams.newBuilder().withId(showParams.id).build();
    server.use(
        http.post(requestOptions.getBaseUri() + `/messages/bulks/files`, () =>
            HttpResponse.json({
                id: randomUUID(),
                object: 'bulk_file',
                url: 'https://example.com',
                created_at: '2023-12-01T15:00:00.0Z',
                expires_at: '2023-12-01T15:00:00.0Z',
            })
        ),
        http.post(requestOptions.getBaseUri() + params.toPath(), () =>
            HttpResponse.json({
                id: showParams.id,
                object: 'bulk_message',
                status: BulkMessageStatus.Processing,
                created_at: '2023-12-01T15:00:00.0Z',
                updated_at: '2023-12-01T15:00:00.0Z',
            })
        ),
        http.get(requestOptions.getBaseUri() + showParams.toPath(), () =>
            HttpResponse.json({
                id: showParams.id,
                object: 'bulk_message',
                status: BulkMessageStatus.Done,
                created_at: '2023-12-01T15:00:00.0Z',
                updated_at: '2023-12-01T15:00:00.0Z',
            })
        ),
        http.get(requestOptions.getBaseUri() + listMessageParams.toPath(), () =>
            HttpResponse.redirect(requestOptions.apiBase + '/example.com', 302)
        )
    );
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('bulkMessageオブジェクトが返る', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const tmpFile = tmp.fileSync();
    const filename = tmpFile.name;

    jest.spyOn(axios, 'put').mockResolvedValue({ data: 'signedUrl' });

    const bulkMessage = await BulkMessageService.create(filename, requestOptions);
    expect(bulkMessage.object).toBe('bulk_message');
});

test('ファイルが存在しない場合はエラー', () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const filename = 'test.csv';

    expect(BulkMessageService.create(filename, requestOptions)).rejects.toThrow(FileNotFoundException);
});

test('ファイルがダウンロードできる', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const filename = 'file.json';
    const fileContents = 'file contents';
    server.use(
        http.get(requestOptions.apiBase + '/example.com', () =>
            HttpResponse.text(fileContents, {
                headers: {
                    'content-disposition': 'attachment;filename="' + filename + "\";filename*=UTF-8''" + filename,
                },
            })
        )
    );

    const tmpdir = fs.mkdtempSync('/tmp/test_');
    const downlosdParams = BulkMessageDownloadParams.newBuilder().withId(id).withDirectoryPath(tmpdir).build();

    await BulkMessageService.download(downlosdParams, requestOptions);
    expect(fs.existsSync(path.join(path.resolve(tmpdir, filename)))).toBe(true);
    const result = fs.readFileSync(path.join(path.resolve(tmpdir, filename)), 'utf-8');
    expect(result).toBe(fileContents);
});

test('bulkMessageのstatusがdone以外でリトライ回数を超過した場合はエラー', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const showParams = BulkMessageShowParams.newBuilder().withId(randomUUID()).build();
    server.use(
        http.get(requestOptions.getBaseUri() + showParams.toPath(), () =>
            HttpResponse.json({
                id: showParams.id,
                object: 'bulk_message',
                status: BulkMessageStatus.Processing,
                created_at: '2023-12-01T15:00:00.0Z',
                updated_at: '2023-12-01T15:00:00.0Z',
            })
        )
    );

    const tmpdir = fs.mkdtempSync('/tmp/test_');
    const downlosdParams = BulkMessageDownloadParams.newBuilder()
        .withId(showParams.id)
        .withDirectoryPath(tmpdir)
        .withMaxRetries(1)
        .withRetryInterval(10)
        .build();
    await expect(BulkMessageService.download(downlosdParams, requestOptions)).rejects.toThrow(
        BulkMessageShowRetryLimitExceedException
    );
}, 20000);

test('結果取得APIが202を返しリトライ回数を超過した場合はエラー', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const showParams = BulkMessageShowParams.newBuilder().withId(randomUUID()).build();
    const listMessageParams = BulkMessageListMessageParams.newBuilder().withId(showParams.id).build();
    server.use(
        http.get(requestOptions.getBaseUri() + showParams.toPath(), () =>
            HttpResponse.json({
                id: showParams.id,
                object: 'bulk_message',
                status: BulkMessageStatus.Done,
                created_at: '2023-12-01T15:00:00.0Z',
                updated_at: '2023-12-01T15:00:00.0Z',
            })
        ),
        http.get(
            requestOptions.getBaseUri() + listMessageParams.toPath(),
            () => new HttpResponse(null, { status: 202 })
        )
    );

    const tmpdir = fs.mkdtempSync('/tmp/test_');
    const downlosdParams = BulkMessageDownloadParams.newBuilder()
        .withId(showParams.id)
        .withDirectoryPath(tmpdir)
        .withMaxRetries(1)
        .withRetryInterval(10)
        .build();
    await expect(BulkMessageService.download(downlosdParams, requestOptions)).rejects.toThrow(
        BulkMessageListMessageRetryLimitExceedException
    );
}, 20000);

test('bulkMessageのstatusがerrorはエラー', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const showParams = BulkMessageShowParams.newBuilder().withId(randomUUID()).build();
    server.use(
        http.get(requestOptions.getBaseUri() + showParams.toPath(), () =>
            HttpResponse.json({
                id: showParams.id,
                object: 'bulk_message',
                status: 'error',
                created_at: '2023-12-01T15:00:00.0Z',
                updated_at: '2023-12-01T15:00:00.0Z',
            })
        )
    );

    const tmpdir = fs.mkdtempSync('/tmp/test_');
    const downlosdParams = BulkMessageDownloadParams.newBuilder()
        .withId(showParams.id)
        .withDirectoryPath(tmpdir)
        .withMaxRetries(1)
        .withRetryInterval(10)
        .build();
    await expect(BulkMessageService.download(downlosdParams, requestOptions)).rejects.toThrow(
        BulkMessageCreateFailedException
    );
});

test('ファイルダウンロード処理にエラーが発生した場合は例外が飛ぶ', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const showParams = BulkMessageShowParams.newBuilder().withId(randomUUID()).build();
    const listMessageParams = BulkMessageListMessageParams.newBuilder().withId(showParams.id).build();
    server.use(
        http.get(requestOptions.getBaseUri() + showParams.toPath(), () =>
            HttpResponse.json({
                id: showParams.id,
                object: 'bulk_message',
                status: BulkMessageStatus.Done,
                created_at: '2023-12-01T15:00:00.0Z',
                updated_at: '2023-12-01T15:00:00.0Z',
            })
        ),
        http.get(requestOptions.getBaseUri() + listMessageParams.toPath(), () =>
            HttpResponse.redirect(requestOptions.apiBase + '/invalid.com', 302)
        ),
        http.get(
            requestOptions.apiBase + '/invalid.com',
            () =>
                new HttpResponse(null, {
                    headers: {
                        'Content-Disposition': 'invalid',
                    },
                })
        )
    );

    const tmpdir = fs.mkdtempSync('/tmp/test_');
    const downlosdParams = BulkMessageDownloadParams.newBuilder()
        .withId(showParams.id)
        .withDirectoryPath(tmpdir)
        .withMaxRetries(1)
        .withRetryInterval(10)
        .build();
    await expect(BulkMessageService.download(downlosdParams, requestOptions)).rejects.toThrow(
        FileDownloadFailedException
    );
});
