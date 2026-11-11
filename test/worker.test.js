import { describe, it, expect, vi } from 'vitest';
import yaml from 'js-yaml';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';

const realityLink = 'vless://00000000-0000-4000-8000-000000000001@example.com:443?security=reality&type=tcp&sni=example.com&pbk=test-key&sid=abcd';

const createTestApp = (overrides = {}) => {
    const runtime = {
        kv: overrides.kv ?? new MemoryKVAdapter(),
        assetFetcher: overrides.assetFetcher ?? null,
        logger: console,
        config: {
            configTtlSeconds: 60,
            shortLinkTtlSeconds: null,
            ...(overrides.config || {})
        }
    };
    return createApp(runtime);
};

describe('Worker', () => {
    it('GET / returns HTML', async () => {
        const app = createTestApp();
        const res = await app.request('http://localhost/');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        const text = await res.text();
        expect(text).toContain('Sublink Worker');
    });

    it('GET /singbox returns JSON', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        const json = await res.json();
        expect(json).toHaveProperty('outbounds');
    });

    it('GET /singbox ignores a Clash base config ID', async () => {
        const kv = new MemoryKVAdapter();
        await kv.put('clash_test', JSON.stringify({
            'proxy-groups': [{ name: 'Custom', type: 'select', proxies: ['DIRECT'] }]
        }));
        const app = createTestApp({ kv });
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}&configId=clash_test`);

        expect(res.status).toBe(200);
        expect(await res.json()).toHaveProperty('route.rule_set');
    });

    it('GET /singbox returns legacy config for sing-box 1.11 UA', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}`, {
            headers: {
                'User-Agent': 'SFI/1.12.2 (Build 2; sing-box 1.11.4; language zh_CN)'
            }
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json?.dns?.servers?.[0]).toHaveProperty('address');
        expect(json?.dns?.servers?.[0]).not.toHaveProperty('type');
        expect(json?.route).not.toHaveProperty('default_domain_resolver');
    });

    it('GET /singbox returns 1.12+ config for sing-box 1.12 UA', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}`, {
            headers: {
                'User-Agent': 'SFA/1.12.12 (587; sing-box 1.12.12; language zh_Hans_CN)'
            }
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json?.dns?.servers?.[0]).toHaveProperty('type');
        expect(json?.dns?.servers?.[0]).not.toHaveProperty('address');
        expect(json?.route).toHaveProperty('default_domain_resolver', 'dns_resolver');
    });

    it('GET /clash returns YAML', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/clash?config=${encodeURIComponent(config)}`);
        expect(res.status).toBe(200);
        // Clash builder returns text/yaml
        expect(res.headers.get('content-type')).toContain('text/yaml');
        const text = await res.text();
        expect(text).toContain('proxies:');
    });

    it.each([
        ['&support-x25519mlkem768=true', true],
        ['&support-x25519mlkem768=false', false],
        ['', undefined],
        ['&support-x25519mlkem768=invalid', undefined],
    ])('GET /clash handles the REALITY VLESS hint %j', async (query, expected) => {
        const config = btoa(`${realityLink}${query}#Reality`);
        const res = await createTestApp().request(`http://localhost/clash?config=${encodeURIComponent(config)}`);

        expect(res.status).toBe(200);
        const result = yaml.load(await res.text());
        expect(result.mode).toBe('rule');
        expect(result.proxies[0]['reality-opts']).toEqual({
            'public-key': 'test-key',
            'short-id': 'abcd',
            ...(expected !== undefined ? { 'support-x25519mlkem768': expected } : {}),
        });
    });

    it('GET /clash preserves the REALITY hint when rebuilding Clash YAML', async () => {
        const config = `
proxies:
  - name: Reality
    type: vless
    server: example.com
    port: 443
    uuid: 00000000-0000-4000-8000-000000000001
    tls: true
    reality-opts:
      public-key: test-key
      short-id: abcd
      support-x25519mlkem768: true
`;
        const res = await createTestApp().request(`http://localhost/clash?config=${encodeURIComponent(config)}`);

        expect(res.status).toBe(200);
        const result = yaml.load(await res.text());
        expect(result.proxies[0]['reality-opts']['support-x25519mlkem768']).toBe(true);
    });

    it('GET /singbox omits the Mihomo REALITY hint', async () => {
        const config = `${realityLink}&support-x25519mlkem768=true#Reality`;
        const res = await createTestApp().request(`http://localhost/singbox?config=${encodeURIComponent(config)}`);

        expect(res.status).toBe(200);
        const result = await res.json();
        const outbound = result.outbounds.find(proxy => proxy.type === 'vless');
        expect(outbound.tls.reality).toEqual({ enabled: true, public_key: 'test-key', short_id: 'abcd' });
        expect(outbound).not.toHaveProperty('reality_support_x25519mlkem768');
    });

    it('GET /clash rejects empty url-test proxy groups with a diagnostic error', async () => {
        const app = createTestApp();
        const config = `
proxies:
  - name: Node-A
    type: ss
    server: a.example.com
    port: 443
    cipher: aes-128-gcm
    password: test
proxy-groups:
  - name: Empty Test Group
    type: url-test
    proxies: []
`;
        const res = await app.request(`http://localhost/clash?config=${encodeURIComponent(config)}`);

        expect(res.status).toBe(400);
        const text = await res.text();
        expect(text).toContain('Invalid proxy group "Empty Test Group"');
        expect(text).toContain('requires at least one proxy or provider reference');
    });

    it('GET /shorten-v2 returns short code', async () => {
        const url = 'http://example.com';
        const kvMock = {
            put: vi.fn(async () => {}),
            get: vi.fn(async () => null),
            delete: vi.fn(async () => {})
        };
        const app = createTestApp({ kv: kvMock });
        const res = await app.request(`http://localhost/shorten-v2?url=${encodeURIComponent(url)}`);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBeTruthy();
        expect(kvMock.put).toHaveBeenCalled();
    });
});
