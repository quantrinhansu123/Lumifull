# Hướng dẫn cấu hình Environment Variables trên Vercel

## Vấn đề
Khi deploy lên Vercel, ứng dụng cần biến môi trường để kết nối với Supabase. File `.env` chỉ hoạt động ở local, không được sử dụng trên Vercel.

## Giải pháp: Cấu hình Environment Variables trên Vercel Dashboard

### Các bước:

1. **Đăng nhập vào Vercel Dashboard**
   - Truy cập: https://vercel.com/dashboard
   - Chọn project của bạn

2. **Vào Settings > Environment Variables**
   - Click vào project
   - Chọn tab **Settings**
   - Click vào **Environment Variables** ở menu bên trái

3. **Thêm các biến môi trường sau:**

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | `https://gsjhsmxyxjyiqovauyrp.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_vXBSa3eP8cvjIK2qLWI6Ug_FoYm4CNy` |

4. **Chọn Environment:**
   - Chọn **Production**, **Preview**, và **Development** (hoặc ít nhất là Production)
   - Click **Save**

5. **Redeploy:**
   - Sau khi thêm biến môi trường, cần **Redeploy** để áp dụng
   - Vào tab **Deployments**
   - Click vào 3 chấm (⋯) của deployment mới nhất
   - Chọn **Redeploy**
   - Hoặc push một commit mới lên git để trigger auto-deploy

## Kiểm tra

Sau khi redeploy, kiểm tra xem ứng dụng có chạy không. Lỗi "supabaseUrl is required" sẽ biến mất.

## Lưu ý

- **Không** commit file `.env` vào git (đã được thêm vào `.gitignore`)
- Biến môi trường trên Vercel được mã hóa và bảo mật
- Sau mỗi lần thêm/sửa biến môi trường, cần redeploy để áp dụng

