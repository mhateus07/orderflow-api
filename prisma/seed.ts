import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
    },
  })

  const adminHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  })

  const empHash = await bcrypt.hash('emp123', 10)
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'employee@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Employee User',
      email: 'employee@demo.com',
      passwordHash: empHash,
      role: Role.EMPLOYEE,
    },
  })

  const productData = [
    { name: 'Margherita Pizza', description: 'Classic tomato and mozzarella', price: 32.9, category: 'Pizza' },
    { name: 'Pepperoni Pizza', description: 'Loaded with pepperoni', price: 38.9, category: 'Pizza' },
    { name: 'Caesar Salad', description: 'Fresh romaine with caesar dressing', price: 24.9, category: 'Salad' },
    { name: 'Classic Burger', description: 'Beef patty with lettuce and tomato', price: 28.9, category: 'Burger' },
    { name: 'Coke', description: '350ml can', price: 6.9, category: 'Drinks' },
    { name: 'Water', description: '500ml bottle', price: 4.9, category: 'Drinks' },
  ]

  for (const product of productData) {
    await prisma.product.create({ data: { tenantId: tenant.id, ...product } })
  }

  await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
  })

  console.log('✅ Seed complete')
  console.log(`   Tenant: ${tenant.slug}`)
  console.log('   Admin:    admin@demo.com / admin123')
  console.log('   Employee: employee@demo.com / emp123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
