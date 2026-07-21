'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface AuditEntry {
  id: string
  actor_user_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
}

interface AuditTableProps {
  data: AuditEntry[]
}

export function AuditTable({ data }: AuditTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Target</TableHead>
          <TableHead className="w-20">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry) => (
          <>
            <TableRow key={entry.id} className="cursor-pointer" onClick={() => toggle(entry.id)}>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(entry.created_at).toLocaleString()}
              </TableCell>
              <TableCell className="font-mono text-xs">{entry.actor_user_id}</TableCell>
              <TableCell>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {entry.action}
                </code>
              </TableCell>
              <TableCell className="text-sm">
                {entry.target_type}
                {entry.target_id && (
                  <span className="ml-1 font-mono text-xs text-muted-foreground">
                    ({entry.target_id.slice(0, 8)}...)
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => toggle(entry.id)}>
                  {expanded.has(entry.id) ? 'Hide' : 'Show'}
                </Button>
              </TableCell>
            </TableRow>
            {expanded.has(entry.id) && (
              <TableRow key={`${entry.id}-details`}>
                <TableCell colSpan={5} className="bg-muted/30">
                  <pre className="overflow-auto rounded bg-muted p-3 text-xs">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                </TableCell>
              </TableRow>
            )}
          </>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
              No audit entries found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
