'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface AccountRow {
  id: string
  name: string
  ownerEmail: string
  plan: { name: string; slug: string } | null
  status: string
  memberCount: number
  createdAt: string
  trialEndsAt: string | null
  messagesToday?: number
}

interface AccountsTableProps {
  accounts: AccountRow[]
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-center">Members</TableHead>
          <TableHead>Trial ends</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((acc) => (
          <TableRow key={acc.id}>
            <TableCell className="font-medium">{acc.name}</TableCell>
            <TableCell className="text-muted-foreground">{acc.ownerEmail}</TableCell>
            <TableCell>{acc.plan?.name ?? '—'}</TableCell>
            <TableCell>
              <Badge className={statusColors[acc.status] ?? 'bg-gray-100 text-gray-700'}>
                {acc.status}
              </Badge>
            </TableCell>
            <TableCell className="text-center text-sm text-muted-foreground">
              {acc.memberCount}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {acc.trialEndsAt
                ? new Date(acc.trialEndsAt).toLocaleDateString()
                : '—'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(acc.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/admin/accounts/${acc.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
        {accounts.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
              No accounts found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
