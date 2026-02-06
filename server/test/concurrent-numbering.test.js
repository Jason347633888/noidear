const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Snowflake ID 生成器（简化版）
class Snowflake {
  constructor(workerId, datacenterId) {
    this.workerId = BigInt(workerId);
    this.datacenterId = BigInt(datacenterId);
    this.sequence = 0n;
    this.lastTimestamp = -1n;
    this.epoch = 1640995200000n; // 2022-01-01
  }

  nextId() {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 0xfffn;
      if (this.sequence === 0n) {
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      ((timestamp - this.epoch) << 22n) |
      (this.datacenterId << 17n) |
      (this.workerId << 12n) |
      this.sequence
    ).toString();
  }
}

const snowflake = new Snowflake(1, 1);

async function testConcurrentDocumentNumbering() {
  console.log('🔍 测试并发文档编号生成...\n');

  // 1. 准备测试数据：创建测试部门
  let testDept;
  try {
    testDept = await prisma.department.findFirst({
      where: { code: 'TEST' }
    });

    if (!testDept) {
      testDept = await prisma.department.create({
        data: {
          id: snowflake.nextId(),
          code: 'TEST',
          name: '测试部门',
          status: 'active',
        }
      });
      console.log('✅ 创建测试部门:', testDept.code);
    } else {
      console.log('✅ 使用现有测试部门:', testDept.code);
    }
  } catch (error) {
    console.error('❌ 准备测试数据失败:', error.message);
    return;
  }

  // 2. 创建测试用户
  let testUser;
  try {
    testUser = await prisma.user.findFirst({
      where: { username: 'test-concurrent' }
    });

    if (!testUser) {
      const hashedPassword = await bcrypt.hash('test-password-123', 10);
      testUser = await prisma.user.create({
        data: {
          id: snowflake.nextId(),
          username: 'test-concurrent',
          password: hashedPassword,
          name: '并发测试用户',
          departmentId: testDept.id,
          role: 'user',
          status: 'active',
        }
      });
      console.log('✅ 创建测试用户:', testUser.username);
    } else {
      console.log('✅ 使用现有测试用户:', testUser.username);
    }
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error.message);
    return;
  }

  // 3. 并发创建10个文档
  console.log('\n🚀 开始并发创建文档...');
  const concurrentCount = 10;
  const promises = Array(concurrentCount).fill(0).map((_, i) =>
    prisma.document.create({
      data: {
        id: snowflake.nextId(),
        level: 1,
        number: 'TEMP', // 临时值，触发 generateDocumentNumber
        title: `并发测试文档 ${i + 1}`,
        filePath: `/tmp/test-${i}.pdf`,
        fileName: `test-${i}.pdf`,
        fileSize: 1024,
        fileType: 'pdf',
        version: 1.0,
        status: 'draft',
        creatorId: testUser.id,
      }
    }).catch(err => {
      console.error(`❌ 创建文档 ${i + 1} 失败:`, err.message);
      return null;
    })
  );

  const results = await Promise.all(promises);
  const successfulDocs = results.filter(r => r !== null);

  console.log(`\n📊 创建结果: ${successfulDocs.length}/${concurrentCount} 成功`);

  if (successfulDocs.length === 0) {
    console.log('⚠️  没有成功创建的文档，无法测试编号');
    return;
  }

  // 4. 检查编号是否重复
  const numbers = successfulDocs.map(r => r.number);
  const uniqueNumbers = [...new Set(numbers)];

  console.log('\n📋 生成的编号:');
  numbers.forEach((num, idx) => {
    console.log(`  ${idx + 1}. ${num}`);
  });

  console.log(`\n🔢 唯一编号数量: ${uniqueNumbers.length}/${numbers.length}`);

  if (uniqueNumbers.length !== numbers.length) {
    console.log('\n❌ 测试失败：发现编号重复！');
    const duplicates = numbers.filter((num, idx) => numbers.indexOf(num) !== idx);
    console.log('重复的编号:', [...new Set(duplicates)]);
  } else {
    console.log('\n✅ 测试通过：所有编号唯一！');
  }

  // 5. 清理测试数据
  console.log('\n🧹 清理测试数据...');
  await prisma.document.deleteMany({
    where: { id: { in: successfulDocs.map(d => d.id) } }
  });
  console.log('✅ 测试数据已清理');
}

async function testConcurrentTemplateNumbering() {
  console.log('\n\n🔍 测试并发模板编号生成...\n');

  // 创建测试用户
  let testUser;
  try {
    testUser = await prisma.user.findFirst({
      where: { username: 'test-concurrent' }
    });

    if (!testUser) {
      const hashedPassword = await bcrypt.hash('test-password-123', 10);
      testUser = await prisma.user.create({
        data: {
          id: snowflake.nextId(),
          username: 'test-concurrent',
          password: hashedPassword,
          name: '并发测试用户',
          role: 'user',
          status: 'active',
        }
      });
    }
  } catch (error) {
    console.error('❌ 准备测试用户失败:', error.message);
    return;
  }

  // 并发创建10个模板
  console.log('🚀 开始并发创建模板...');
  const concurrentCount = 10;
  const promises = Array(concurrentCount).fill(0).map((_, i) =>
    prisma.template.create({
      data: {
        id: snowflake.nextId(),
        level: 4,
        number: 'TEMP',
        title: `并发测试模板 ${i + 1}`,
        fieldsJson: [],
        version: 1.0,
        status: 'active',
        creatorId: testUser.id,
      }
    }).catch(err => {
      console.error(`❌ 创建模板 ${i + 1} 失败:`, err.message);
      return null;
    })
  );

  const results = await Promise.all(promises);
  const successfulTemplates = results.filter(r => r !== null);

  console.log(`\n📊 创建结果: ${successfulTemplates.length}/${concurrentCount} 成功`);

  if (successfulTemplates.length === 0) {
    console.log('⚠️  没有成功创建的模板，无法测试编号');
    return;
  }

  // 检查编号是否重复
  const numbers = successfulTemplates.map(r => r.number);
  const uniqueNumbers = [...new Set(numbers)];

  console.log('\n📋 生成的编号:');
  numbers.forEach((num, idx) => {
    console.log(`  ${idx + 1}. ${num}`);
  });

  console.log(`\n🔢 唯一编号数量: ${uniqueNumbers.length}/${numbers.length}`);

  if (uniqueNumbers.length !== numbers.length) {
    console.log('\n❌ 测试失败：发现编号重复！');
    const duplicates = numbers.filter((num, idx) => numbers.indexOf(num) !== idx);
    console.log('重复的编号:', [...new Set(duplicates)]);
  } else {
    console.log('\n✅ 测试通过：所有编号唯一！');
  }

  // 清理测试数据
  console.log('\n🧹 清理测试数据...');
  await prisma.template.deleteMany({
    where: { id: { in: successfulTemplates.map(t => t.id) } }
  });
  console.log('✅ 测试数据已清理');
}

async function runTests() {
  try {
    await testConcurrentDocumentNumbering();
    await testConcurrentTemplateNumbering();
  } catch (error) {
    console.error('\n💥 测试过程中出现错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
