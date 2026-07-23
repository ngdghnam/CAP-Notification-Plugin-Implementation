# Alert Notification Service (ANS) Troubleshooting Guide

Tài liệu này tổng hợp các lỗi thường gặp khi tích hợp thư viện `@sap_oss/alert-notification-client` vào dự án SAP CAP, nguyên nhân gốc rễ và cách khắc phục chi tiết.

---

## 1. Lỗi thiếu Username (Xác thực OAuth)

**Thông báo lỗi:**
```text
Failed to send notification for Inquiry: Error: Username must be provided
    at new OAuthAuthentication (...)
```

**Nguyên nhân:**
Thư viện yêu cầu cung cấp `username` và `password` để tạo XSUAA OAuth Token. Tuy nhiên, định dạng JSON Credentials của **Alert Notification Service** trên BTP thường dùng `client_id` và `client_secret` (snake_case). Trong khi đó, các dịch vụ khác (như chuẩn mặc định của XSUAA) lại dùng `clientid` và `clientsecret` (viết liền). Việc gọi sai tên field dẫn đến biến bị `undefined`.

**Cách khắc phục:**
Cần ánh xạ (mapping) cấu hình hỗ trợ cả 2 định dạng (có dấu `_` và viết liền):
```typescript
username: creds.client_id || creds.clientid || creds.uaa?.clientid,
password: creds.client_secret || creds.clientsecret || creds.uaa?.clientsecret,
```

---

## 2. Lỗi Region không hợp lệ (Type Error)

**Thông báo lỗi:**
```text
TypeError: configuration.region.getPlatform is not a function
    at new AlertNotificationClient (...)
```

**Nguyên nhân:**
Thư viện `@sap_oss/alert-notification-client` sử dụng TypeScript rất chặt chẽ. Thuộc tính `region` không chấp nhận một Object thuần (plain object) như `{ platform: 'cf', url: '...' }` vì nội bộ thư viện sẽ gọi các phương thức prototype (ví dụ: `getPlatform()`). Object tự định nghĩa sẽ không có các hàm này.

**Cách khắc phục:**
Phải import module `RegionUtils` từ thư viện và sử dụng các instance (class objects) đã được định nghĩa sẵn.
```typescript
import { RegionUtils } from "@sap_oss/alert-notification-client";

// Khi khởi tạo client:
this.ansClient = new AlertNotificationClient({
    authentication: new OAuthAuthentication({...}),
    region: RegionUtils.EU10 // Sử dụng đối tượng Region chuẩn của Frankfurt
});
```

---

## 3. Lỗi 401 Unauthorized (Sai endpoint xin Token)

**Thông báo lỗi:**
```text
AxiosError: Request failed with status code 401
...
baseURL: 'https://clm-sl-ans-live-ans-service-api.cfapps.eu10.hana.ondemand.com/oauth/token?grant_type=client_credentials'
```

**Nguyên nhân:**
Quá trình xác thực OAuth bị thất bại (401) vì hệ thống đã **gọi nhầm vào URL của API nhận Event** thay vì URL của máy chủ xác thực XSUAA.
Trong credentials của BTP Alert Notification:
- `url`: Là endpoint API để gửi sự kiện (Event API).
- `oauth_url`: Là endpoint XSUAA để lấy Access Token.

Nếu Framework SAP CAP chạy cơ chế bind tự động, nó đôi lúc sẽ chuẩn hoá (normalize) credentials và nhét các thông số XSUAA vào một object con tên là `uaa`, dẫn tới field `oauth_url` bị mất. Hệ quả là code fallback về dùng nhầm field `url`.

**Cách khắc phục:**
1. Ưu tiên đọc trực tiếp từ biến môi trường gốc `process.env.VCAP_SERVICES` để lấy JSON thô chưa qua "nhào nặn" của framework CAP.
2. Thiết lập cơ chế fallback đọc URL an toàn, kiểm tra `oauth_url` đầu tiên, sau đó mới đến `uaa.url`:
```typescript
// 1. Cố gắng lấy nguyên bản từ biến môi trường VCAP_SERVICES
if (process.env.VCAP_SERVICES) {
    const vcap = JSON.parse(process.env.VCAP_SERVICES);
    // Lấy credentials...
}

// 2. Chỉnh lại luồng parse OAuth Token URL
oAuthTokenUrl: creds.oauth_url || (creds.uaa ? creds.uaa.url + "/oauth/token?grant_type=client_credentials" : "")
```

Bằng cách này, ứng dụng sẽ luôn đánh đúng vào địa chỉ (XSUAA) để sinh token hợp lệ, bất kể môi trường đang chạy là eu10 hay eu10-004.

---

## 4. Lỗi "Cannot read properties of undefined (reading 'ID')" (Data payload là Array/Iterable)

**Thông báo lỗi:**
```text
TypeError: Cannot read properties of undefined (reading 'ID')
    at CarShopService.processInquiryNotification
```

**Nguyên nhân:**
Trong các Hook của SAP CAP (ví dụ: `after('CREATE')`), tham số `data` trả về đôi khi không phải là một Object đơn lẻ, mà là một **Custom Iterable** (`cds.List`, `cds.Result`). 
- Khi dùng `console.log(data)` hoặc `JSON.stringify(data)`, nó in ra giống hệt một mảng: `[ { "ID": "..." } ]`.
- Tuy nhiên, hàm JavaScript `Array.isArray(data)` lại trả về `false`.
- Việc truy cập trực tiếp bằng Index như `data[0]` cũng trả về `undefined`.

Do đó, các lệnh gọi `data.ID` hay `data[0].ID` đều bị văng lỗi hoặc trả về `undefined`, khiến câu lệnh `SELECT` tiếp theo không có ID để fetch dữ liệu (kết quả là các cột Join như tên khách hàng, tên xe bị null).

**Cách khắc phục:**
Không dùng `Array.isArray()` hay `data[0]`. Thay vào đó, kiểm tra xem đối tượng có hỗ trợ `Symbol.iterator` hay không và dùng vòng lặp `for...of` để lấy an toàn phần tử đầu tiên:
```typescript
// Lấy record an toàn từ Data (dù là Object, Array, hay Custom Iterable)
let record = data;
if (record && !record.ID) {
    if (typeof record[Symbol.iterator] === 'function') {
        for (const item of record) {
            record = item;
            break; // Chỉ lấy cục data đầu tiên
        }
    } else if (record.length > 0) {
        record = record[0];
    }
}

if (!record || !record.ID) {
    console.warn("==> Could not find ID in data. Aborting notification.");
    return;
}
```
Cách này đảm bảo code lấy được đúng thuộc tính `ID` bất kể Framework SAP CAP trả về cấu trúc dữ liệu dị đến mức nào.
