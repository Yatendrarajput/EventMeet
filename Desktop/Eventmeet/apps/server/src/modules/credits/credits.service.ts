import { Decimal } from '@prisma/client/runtime/library'
import { prisma }   from '@/lib/prisma'
import { AppError } from '@/shared/middleware/errorHandler'
import { logger }   from '@/shared/utils/logger'

// ─────────────────────────────────────────────────────────────────
// Ensure CreditBalance row exists for user (upsert)
// ─────────────────────────────────────────────────────────────────
async function ensureBalance(userId: string) {
  return prisma.creditBalance.upsert({
    where:  { userId },
    create: { userId, balance: 0, totalRecharged: 0, totalSpent: 0, totalRefunded: 0 },
    update: {},
  })
}

// ─────────────────────────────────────────────────────────────────
// Get credit balance
// ─────────────────────────────────────────────────────────────────
export async function getBalance(userId: string) {
  const balance = await prisma.creditBalance.findUnique({ where: { userId } })
  if (!balance) return { balance: 0, totalRecharged: 0, totalSpent: 0, totalRefunded: 0 }
  return {
    balance:        Number(balance.balance),
    totalRecharged: Number(balance.totalRecharged),
    totalSpent:     Number(balance.totalSpent),
    totalRefunded:  Number(balance.totalRefunded),
  }
}

// ─────────────────────────────────────────────────────────────────
// Get transaction history
// ─────────────────────────────────────────────────────────────────
export async function getTransactions(userId: string, page: number, limit: number) {
  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where:   { userId },
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, status: true, amount: true,
        balanceBefore: true, balanceAfter: true,
        description: true, expiresAt: true, createdAt: true,
        booking: { select: { id: true, event: { select: { id: true, title: true } } } },
      },
    }),
    prisma.creditTransaction.count({ where: { userId } }),
  ])

  return { transactions, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// Add credits (RECHARGE) — internal use by other services
// ─────────────────────────────────────────────────────────────────
export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  bookingId?: string,
) {
  const creditAmount = new Decimal(amount)

  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.upsert({
      where:  { userId },
      create: { userId, balance: creditAmount, totalRecharged: creditAmount, totalSpent: 0, totalRefunded: 0 },
      update: {
        balance:        { increment: creditAmount },
        totalRecharged: { increment: creditAmount },
      },
    })

    const before = new Decimal(balance.balance).sub(creditAmount)

    await tx.creditTransaction.create({
      data: {
        userId,
        type:          'RECHARGE',
        status:        'COMPLETED',
        amount:        creditAmount,
        balanceBefore: before,
        balanceAfter:  balance.balance,
        bookingId,
        description,
      },
    })

    return balance
  })

  logger.info({ userId, amount, description }, 'Credits added')
  return result
}

// ─────────────────────────────────────────────────────────────────
// Deduct credits (BOOKING_DEBIT) — internal use by bookings service
// ─────────────────────────────────────────────────────────────────
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  bookingId?: string,
) {
  const creditAmount = new Decimal(amount)

  const balance = await prisma.creditBalance.findUnique({ where: { userId } })
  if (!balance || new Decimal(balance.balance).lt(creditAmount)) {
    throw new AppError(402, 'INSUFFICIENT_CREDITS', 'Insufficient credit balance')
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.creditBalance.update({
      where: { userId },
      data: {
        balance:    { decrement: creditAmount },
        totalSpent: { increment: creditAmount },
      },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        type:          'BOOKING_DEBIT',
        status:        'COMPLETED',
        amount:        creditAmount,
        balanceBefore: balance.balance,
        balanceAfter:  updated.balance,
        bookingId,
        description,
      },
    })

    return updated
  })

  logger.info({ userId, amount, description }, 'Credits deducted')
  return result
}

// ─────────────────────────────────────────────────────────────────
// Refund credits — internal use by refunds service
// ─────────────────────────────────────────────────────────────────
export async function refundCredits(
  userId: string,
  amount: number,
  description: string,
  bookingId?: string,
) {
  const creditAmount = new Decimal(amount)

  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.upsert({
      where:  { userId },
      create: { userId, balance: creditAmount, totalRecharged: 0, totalSpent: 0, totalRefunded: creditAmount },
      update: {
        balance:       { increment: creditAmount },
        totalRefunded: { increment: creditAmount },
      },
    })

    const before = new Decimal(balance.balance).sub(creditAmount)

    await tx.creditTransaction.create({
      data: {
        userId,
        type:          'REFUND',
        status:        'COMPLETED',
        amount:        creditAmount,
        balanceBefore: before,
        balanceAfter:  balance.balance,
        bookingId,
        description,
      },
    })

    return balance
  })

  logger.info({ userId, amount, description }, 'Credits refunded')
  return result
}
