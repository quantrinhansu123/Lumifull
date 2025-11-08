import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';
import bcrypt from 'bcryptjs';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKajnty6kaDBAHldn-BGu-qja5Jo9R0ks",
  authDomain: "report-867c2.firebaseapp.com",
  databaseURL: "https://report-867c2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "report-867c2",
  storageBucket: "report-867c2.firebasestorage.app",
  messagingSenderId: "911588040639",
  appId: "1:911588040639:web:60b5380acd25ba85c8cb0a",
  measurementId: "G-SFM9W6K1NT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Default password
const DEFAULT_PASSWORD = '123456';

async function createUserAccounts() {
  try {
    console.log('🔄 Bắt đầu tạo tài khoản từ human_resources...\n');

    // Đọc dữ liệu từ human_resources
    const hrRef = ref(database, 'human_resources');
    const hrSnapshot = await get(hrRef);

    if (!hrSnapshot.exists()) {
      console.log('❌ Không tìm thấy dữ liệu trong human_resources');
      return;
    }

    const hrData = hrSnapshot.val();
    const hrArray = Object.entries(hrData);
    
    console.log(`📊 Tìm thấy ${hrArray.length} nhân viên trong human_resources\n`);

    // Đọc users hiện tại để tránh trùng
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    const existingUsers = usersSnapshot.exists() ? usersSnapshot.val() : {};
    const existingEmails = new Set(
      Object.values(existingUsers).map(u => u.email?.toLowerCase())
    );

    // Hash password mặc định
    const hashedPassword = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const roleStats = {
      admin: 0,
      leader: 0,
      manager: 0,
      user: 0
    };

    // Tạo tài khoản cho mỗi nhân viên
    for (const [hrId, hrUser] of hrArray) {
      try {
        const email = hrUser.email?.trim();
        const name = hrUser['Họ Và Tên']?.trim();
        const team = hrUser.Team?.trim();
        const branch = hrUser['chi nhánh']?.trim();
        const position = hrUser['Vị trí']?.trim();
        const department = hrUser['Bộ phận']?.trim();
        const shift = hrUser.Ca?.trim();

        // Kiểm tra email hợp lệ
        if (!email) {
          console.log(`⚠️  Bỏ qua ${name || 'Không có tên'}: Thiếu email`);
          skipped++;
          continue;
        }

        // Kiểm tra email đã tồn tại
        if (existingEmails.has(email.toLowerCase())) {
          console.log(`⏭️  Bỏ qua ${name}: Email ${email} đã tồn tại`);
          skipped++;
          continue;
        }

        // Tạo username từ email (phần trước @)
        const username = email.split('@')[0];

        // Xác định role dựa trên vị trí (position)
        let role = 'user'; // Mặc định là user
        const positionLower = (position || '').toLowerCase();
        
        if (positionLower.includes('leader') || positionLower.includes('trưởng nhóm')) {
          role = 'leader';
        } else if (positionLower.includes('admin') || positionLower.includes('quản trị')) {
          role = 'admin';
        } else if (positionLower.includes('manager') || positionLower.includes('quản lý')) {
          role = 'manager';
        }
        // Các vị trí khác (NV, nhân viên, etc.) sẽ là 'user'

        // Tạo user account
        const newUserRef = ref(database, `users/${hrId}`);
        const userData = {
          username: username,
          email: email,
          password: hashedPassword,
          name: name || '',
          team: team || '',
          branch: branch || '',
          position: position || '',
          department: department || '',
          shift: shift || '',
          role: role,
          id_ns: hrUser.id || '',
          createdAt: new Date().toISOString(),
          createdBy: 'auto-script'
        };

        await set(newUserRef, userData);
        
        console.log(`✅ Đã tạo: ${name} (${email}) - Role: ${role.toUpperCase()}`);
        created++;
        roleStats[role]++;
        existingEmails.add(email.toLowerCase());

      } catch (error) {
        console.error(`❌ Lỗi khi tạo tài khoản ${hrUser['Họ Và Tên']}: ${error.message}`);
        errors++;
      }
    }

    // Tổng kết
    console.log('\n' + '='.repeat(50));
    console.log('📊 KẾT QUẢ:');
    console.log(`✅ Đã tạo: ${created} tài khoản`);
    console.log(`⏭️  Đã bỏ qua: ${skipped} tài khoản`);
    console.log(`❌ Lỗi: ${errors} tài khoản`);
    console.log('\n📋 PHÂN QUYỀN:');
    console.log(`   👑 Admin: ${roleStats.admin} tài khoản`);
    console.log(`   🎖️  Leader: ${roleStats.leader} tài khoản`);
    console.log(`   📊 Manager: ${roleStats.manager} tài khoản`);
    console.log(`   👤 User: ${roleStats.user} tài khoản`);
    console.log('='.repeat(50));
    console.log('\n💡 Thông tin đăng nhập:');
    console.log(`   Email: [email từ human_resources]`);
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log('\n📌 Phân quyền tự động dựa trên vị trí:');
    console.log(`   - Leader/Trưởng nhóm → role: leader`);
    console.log(`   - Admin/Quản trị → role: admin`);
    console.log(`   - Manager/Quản lý → role: manager`);
    console.log(`   - NV/Nhân viên/Khác → role: user`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Lỗi chung:', error);
  }
}

// Chạy script
createUserAccounts()
  .then(() => {
    console.log('\n✅ Hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script thất bại:', error);
    process.exit(1);
  });
