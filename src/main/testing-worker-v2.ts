import { parentPort } from 'worker_threads';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';
import { JSONPath } from 'jsonpath-plus';
import * as crypto from 'crypto';
import { CookieJar } from 'tough-cookie';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

interface BotState {
  id: number;
  status: 'SUCCESS' | 'FAIL' | 'RETRY' | 'NONE';
  variables: Map<string, string>;
  cookieJar: CookieJar;
  lastResponse: {
    statusCode: number;
    headers: Record<string, string>;
    source: string;
  } | null;
  browser?: any;
  page?: any;
}

class WorkerBotV2 {
  private state: BotState;
  private logs: any[] = [];
  private debugMode: boolean;
  private breakpoints: Set<number>;
  private currentLine: number = 0;
  private defaultHeaders: Record<string, string>;

  constructor(
    dataLine: string,
    globals: Record<string, string>,
    defaultHeaders: Record<string, string> = {},
    debugMode = false,
    breakpoints: number[] = []
  ) {
    const [user, pass] = dataLine.split(':');
    const variables = new Map<string, string>();

    variables.set('SOURCE', dataLine);
    variables.set('USER', user || '');
    variables.set('PASS', pass || '');

    Object.entries(globals).forEach(([key, value]) => {
      variables.set(key, value);
    });

    this.state = {
      id: Math.floor(Math.random() * 10000),
      status: 'NONE',
      variables,
      cookieJar: new CookieJar(),
      lastResponse: null,
    };

    this.defaultHeaders = defaultHeaders;
    this.debugMode = debugMode;
    this.breakpoints = new Set(breakpoints);
  }

  async execute(configScript: string, proxy: string | null) {
    const lines = configScript.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    for (let i = 0; i < lines.length; i++) {
      this.currentLine = i;

      if (this.debugMode && this.breakpoints.has(i)) {
        return {
          debugInfo: {
            hitBreakpoint: true,
            line: i,
            botState: this.serializeState(),
          },
        };
      }

      const line = lines[i];
      const interpolated = this.interpolateVariables(line);
      const parsed = this.parseLine(interpolated);

      if (!parsed) continue;

      try {
        const shouldStop = await this.executeCommand(parsed, proxy);
        if (shouldStop) break;
      } catch (error: any) {
        this.log('FAIL', `Error at line ${i}: ${error.message}`);

        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return { proxyError: true, error: error.message };
        }
      }
    }

    return {
      status: this.state.status === 'NONE' ? 'FAIL' : this.state.status,
      variables: Object.fromEntries(this.state.variables),
      logs: this.logs,
    };
  }

  private async executeRequest(params: any, proxy: string | null) {
    // Merge default headers with request-specific headers
    const headers = {
      ...this.defaultHeaders,
      ...params.headers,
    };

    // Build got-scraping options
    const options: any = {
      url: params.url,
      method: params.method,
      headers,
      cookieJar: this.state.cookieJar,
      followRedirect: true,
      throwHttpErrors: false,
      timeout: {
        request: 30000,
      },
      // Advanced fingerprinting options
      http2: true,
      headerGeneratorOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
        devices: ['desktop'],
        operatingSystems: ['windows', 'macos', 'linux'],
      },
    };

    if (params.content) {
      options.body = params.content;
      if (params.contentType) {
        options.headers['content-type'] = params.contentType;
      }
    }

    if (proxy) {
      const proxyUrl = proxy.includes('://') ? proxy : `http://${proxy}`;
      options.proxyUrl = proxyUrl;
    }

    const response = await gotScraping(options);

    this.state.lastResponse = {
      statusCode: response.statusCode,
      headers: response.headers as Record<string, string>,
      source: response.body,
    };

    this.log('INFO', `REQUEST ${params.method} ${params.url} -> ${response.statusCode}`);
  }

  private async executeCommand(parsed: any, proxy: string | null): Promise<boolean> {
    switch (parsed.type) {
      case 'REQUEST':
        await this.executeRequest(parsed.params, proxy);
        break;

      case 'PARSE':
        this.executeParse(parsed.params);
        break;

      case 'KEYCHECK':
        const found = this.executeKeycheck(parsed.params);
        if (found && (parsed.params.type === 'SUCCESS' || parsed.params.type === 'FAIL')) {
          return true;
        }
        break;

      case 'SET':
        this.executeSet(parsed.params);
        break;

      case 'FUNCTION':
        this.executeFunction(parsed.params);
        break;

      case 'SOLVECAPTCHA':
        await this.executeSolveCaptcha(parsed.params);
        break;

      case 'BROWSER':
        await this.executeBrowser(parsed.params);
        break;

      case 'IF':
        const conditionMet = this.evaluateCondition(parsed.params.condition);
        if (!conditionMet && parsed.params.skipTo) {
          return false;
        }
        break;
    }

    return false;
  }

  private executeParse(params: any) {
    if (!this.state.lastResponse) return;

    const input = params.input === '<SOURCE>'
      ? this.state.lastResponse.source
      : this.interpolateVariables(params.input);

    let result = '';

    switch (params.type.toUpperCase()) {
      case 'LR':
        const leftIndex = input.indexOf(params.left);
        if (leftIndex !== -1) {
          const startIndex = leftIndex + params.left.length;
          const rightIndex = input.indexOf(params.right, startIndex);
          if (rightIndex !== -1) {
            result = input.substring(startIndex, rightIndex);
          }
        }
        break;

      case 'CSS':
        const $ = cheerio.load(input);
        const element = $(params.left);
        if (params.right.toUpperCase() === 'INNERHTML') {
          result = element.html() || '';
        } else if (params.right.toUpperCase() === 'OUTERHTML') {
          result = $.html(element) || '';
        } else {
          result = element.attr(params.right) || '';
        }
        break;

      case 'JSON':
        try {
          const json = JSON.parse(input);
          const results = JSONPath({ path: params.left, json });
          result = results.length > 0 ? String(results[0]) : '';
        } catch (e) {
          this.log('FAIL', `JSON parse error: ${e}`);
        }
        break;

      case 'REGEX':
        const regex = new RegExp(params.left, params.flags || '');
        const match = input.match(regex);
        result = match ? (match[1] || match[0]) : '';
        break;
    }

    this.state.variables.set(params.varName, result);
    this.log('INFO', `PARSE ${params.type} -> ${params.varName} = "${result.substring(0, 50)}..."`);
  }

  private executeKeycheck(params: any): boolean {
    if (!this.state.lastResponse) return false;

    const keyword = this.interpolateVariables(params.keyword);
    const found = this.state.lastResponse.source.includes(keyword);

    if (found) {
      this.state.status = params.type as any;
      this.log(params.type === 'SUCCESS' ? 'SUCCESS' : 'FAIL',
        `KEYCHECK ${params.type} found: "${keyword}"`);
      return true;
    }

    return false;
  }

  private executeSet(params: any) {
    const value = this.interpolateVariables(params.value);
    this.state.variables.set(params.varName, value);
    this.log('INFO', `SET ${params.varName} = "${value}"`);
  }

  private executeFunction(params: any) {
    const input = this.interpolateVariables(params.input || '');
    let result = '';

    switch (params.function.toUpperCase()) {
      case 'SHA256':
        result = crypto.createHash('sha256').update(input).digest('hex');
        break;
      case 'MD5':
        result = crypto.createHash('md5').update(input).digest('hex');
        break;
      case 'BASE64ENCODE':
        result = Buffer.from(input).toString('base64');
        break;
      case 'BASE64DECODE':
        result = Buffer.from(input, 'base64').toString('utf-8');
        break;
      case 'URLENCODE':
        result = encodeURIComponent(input);
        break;
      case 'URLDECODE':
        result = decodeURIComponent(input);
        break;
      case 'LENGTH':
        result = String(input.length);
        break;
      case 'REPLACE':
        result = input.replace(new RegExp(params.find, 'g'), params.replace);
        break;
      case 'RANDOM':
        result = Math.random().toString(36).substring(2, 15);
        break;
      case 'TIMESTAMP':
        result = String(Date.now());
        break;
      case 'UPPERCASE':
        result = input.toUpperCase();
        break;
      case 'LOWERCASE':
        result = input.toLowerCase();
        break;
    }

    this.state.variables.set(params.varName, result);
    this.log('INFO', `FUNCTION ${params.function} -> ${params.varName}`);
  }

  private async executeSolveCaptcha(params: any) {
    const apiKey = this.interpolateVariables(params.apiKey);
    const siteKey = this.interpolateVariables(params.siteKey);
    const pageUrl = this.interpolateVariables(params.pageUrl);

    this.log('INFO', `SOLVECAPTCHA starting for ${pageUrl}`);

    try {
      const submitResponse = await gotScraping.post({
        url: 'http://2captcha.com/in.php',
        form: {
          key: apiKey,
          method: 'userrecaptcha',
          googlekey: siteKey,
          pageurl: pageUrl,
          json: 1,
        },
      }).json<any>();

      if (submitResponse.status !== 1) {
        throw new Error(`Captcha submit failed: ${submitResponse.error_text}`);
      }

      const requestId = submitResponse.request;

      let attempts = 0;
      while (attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultResponse = await gotScraping({
          url: 'http://2captcha.com/res.php',
          searchParams: {
            key: apiKey,
            action: 'get',
            id: requestId,
            json: 1,
          },
        }).json<any>();

        if (resultResponse.status === 1) {
          const token = resultResponse.request;
          this.state.variables.set(params.varName, token);
          this.log('SUCCESS', `SOLVECAPTCHA solved -> ${params.varName}`);
          return;
        }

        attempts++;
      }

      throw new Error('Captcha solving timeout');
    } catch (error: any) {
      this.log('FAIL', `SOLVECAPTCHA error: ${error.message}`);
    }
  }

  private async executeBrowser(params: any) {
    try {
      if (!this.state.browser) {
        this.state.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
          ],
        });

        this.state.page = await this.state.browser.newPage();

        // Transfer cookies from gotScraping to browser
        const cookies = await this.state.cookieJar.getCookies('https://example.com');
        if (cookies.length > 0) {
          await this.state.page.context().addCookies(cookies.map((c: any) => ({
            name: c.key,
            value: c.value,
            domain: c.domain,
            path: c.path,
            expires: c.expires ? c.expires.getTime() / 1000 : undefined,
            httpOnly: c.httpOnly,
            secure: c.secure,
            sameSite: 'Lax',
          })));
        }
      }

      const page = this.state.page;

      switch (params.action.toUpperCase()) {
        case 'GOTO':
          await page.goto(this.interpolateVariables(params.url), {
            waitUntil: 'networkidle',
            timeout: 30000,
          });
          this.log('INFO', `BROWSER GOTO ${params.url}`);
          break;

        case 'CLICK':
          await page.click(params.selector, { timeout: 10000 });
          this.log('INFO', `BROWSER CLICK ${params.selector}`);
          break;

        case 'TYPE':
          await page.type(params.selector, this.interpolateVariables(params.value), {
            delay: 100,
          });
          this.log('INFO', `BROWSER TYPE ${params.selector}`);
          break;

        case 'WAITFORSELECTOR':
          await page.waitForSelector(params.selector, { timeout: 10000 });
          this.log('INFO', `BROWSER WAITFORSELECTOR ${params.selector}`);
          break;

        case 'EVALUATE':
          const result = await page.evaluate(params.script);
          if (params.varName) {
            this.state.variables.set(params.varName, String(result));
          }
          this.log('INFO', `BROWSER EVALUATE -> ${params.varName}`);
          break;
      }

      this.state.lastResponse = {
        statusCode: 200,
        headers: {},
        source: await page.content(),
      };

    } catch (error: any) {
      this.log('FAIL', `BROWSER error: ${error.message}`);
    }
  }

  private evaluateCondition(condition: any): boolean {
    const left = this.interpolateVariables(condition.left);
    const right = this.interpolateVariables(condition.right);

    switch (condition.op) {
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case 'CONTAINS':
        return left.includes(right);
      case 'NOTCONTAINS':
        return !left.includes(right);
      case '>':
        return parseFloat(left) > parseFloat(right);
      case '<':
        return parseFloat(left) < parseFloat(right);
      case '>=':
        return parseFloat(left) >= parseFloat(right);
      case '<=':
        return parseFloat(left) <= parseFloat(right);
      default:
        return false;
    }
  }

  private interpolateVariables(text: string): string {
    let result = text;
    this.state.variables.forEach((value, key) => {
      result = result.replace(new RegExp(`<${key}>`, 'g'), value);
    });
    return result;
  }

  private parseLine(line: string): any {
    // Same parsing logic as before, but optimized
    const trimmed = line.trim();
    const upperLine = trimmed.toUpperCase();

    // Use a parsing registry for efficiency
    const parsers = this.getParserRegistry();

    for (const parser of parsers) {
      if (upperLine.startsWith(parser.prefix)) {
        const match = trimmed.match(parser.regex);
        if (match) {
          return parser.handler(match);
        }
      }
    }

    return null;
  }

  private getParserRegistry() {
    return [
      {
        prefix: 'REQUEST',
        regex: /^REQUEST\s+(\w+)\s+"([^"]+)"(?:\s+(.+))?/i,
        handler: (match: RegExpMatchArray) => ({
          type: 'REQUEST',
          params: {
            method: match[1],
            url: match[2],
            headers: this.parseHeaders(match[3]),
          },
        }),
      },
      // ... other parsers
    ];
  }

  private parseHeaders(headerString?: string): Record<string, string> {
    if (!headerString) return {};

    const headers: Record<string, string> = {};
    const headerRegex = /HEADER\s+"([^:]+):\s*([^"]+)"/gi;
    let match;

    while ((match = headerRegex.exec(headerString)) !== null) {
      headers[match[1]] = match[2];
    }

    return headers;
  }

  private log(type: string, message: string) {
    this.logs.push({
      type,
      message: `[Bot ${this.state.id}] ${message}`,
      botId: this.state.id,
      timestamp: Date.now(),
    });
  }

  private serializeState() {
    return {
      id: this.state.id,
      status: this.state.status,
      variables: Object.fromEntries(this.state.variables),
      lastResponse: this.state.lastResponse,
    };
  }

  async cleanup() {
    if (this.state.browser) {
      await this.state.browser.close();
    }
  }
}

// Worker entry point
if (parentPort) {
  parentPort.on('message', async (task) => {
    const bot = new WorkerBotV2(
      task.dataLine,
      task.globals,
      task.defaultHeaders || {},
      task.debugMode,
      task.breakpoints
    );

    try {
      const result = await bot.execute(task.configScript, task.proxy);
      parentPort!.postMessage(result);
    } catch (error: any) {
      parentPort!.postMessage({
        error: error.message,
        status: 'FAIL',
      });
    } finally {
      await bot.cleanup();
    }
  });
}
