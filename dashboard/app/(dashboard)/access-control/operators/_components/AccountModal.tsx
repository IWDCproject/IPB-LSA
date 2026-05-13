'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { createAccount, updateAccount, deleteAccount } from '../_actions'
import type { OperatorUser } from '../_actions'

// -- Types ---------------------------------------------------------------------

type Mode = 'create' | 'edit'

interface AccountModalProps {
  mode: Mode
  open: boolean
  onClose: () => void
  user?: OperatorUser   // populated when mode === 'edit'
  currentUserId: string         // logged-in SuperAdmin's own ID
}

// -- Helpers -------------------------------------------------------------------

function resolveRoleKey(user: OperatorUser): 'super_admin' | 'operator' {
  const name =
    typeof user.role === 'object' && user.role !== null
      ? user.role.name
      : (user.role as string | null) ?? ''
  return name === 'Administrator' || name === 'SuperAdmin' ? 'super_admin' : 'operator'
}

// -- Feedback components --------------------------------------------------------

function InlineError({ message }: { message: string }) {
  return <p className="text-xs text-red-500 mt-1" role="alert">{message}</p>
}

function InlineSuccess({ message }: { message: string }) {
  return <p className="text-xs text-green-600 mt-1" role="status">{message}</p>
}

// -- Main modal ----------------------------------------------------------------

export function AccountModal({
  mode,
  open,
  onClose,
  user,
  currentUserId,
}: AccountModalProps) {
  const isEdit = mode === 'edit'

  // -- Form state
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'super_admin' | 'operator'>('operator')

  // -- Feedback
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  // Populate / reset on open
  useEffect(() => {
    if (!open) return
    if (isEdit && user) {
      setOrgName(user.organisation_name ?? '')
      setEmail(user.email)
      setRole(resolveRoleKey(user))
    } else {
      setOrgName('')
      setEmail('')
      setRole('operator')
    }
    setError(null)
    setSuccess(null)
  }, [open, isEdit, user])

  const isSelf = isEdit && user?.id === currentUserId
  const selfRoleLocked = isSelf

  function handleClose() {
    if (isPending || isDeletePending) return
    onClose()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const fd = new FormData()
    fd.set('organisationName', orgName)
    fd.set('email', email)
    fd.set('role', role)

    startTransition(async () => {
      const result = isEdit && user
        ? await updateAccount(user.id, fd)
        : await createAccount(fd)

      if (!result.success) {
        setError(result.error)
        return
      }

      setSuccess(isEdit ? 'Akun berhasil diperbarui.' : 'Akun berhasil dibuat.')
      setTimeout(onClose, 900)
    })
  }

  async function handleDeleteConfirm() {
    if (!user) return
    return new Promise<void>((resolve) => {
      startDeleteTransition(async () => {
        const result = await deleteAccount(user.id)
        if (!result.success) {
          setError(result.error)
        } else {
          onClose()
        }
        resolve()
      })
    })
  }

  const submitLabel = isPending
    ? (isEdit ? 'Menyimpan…' : 'Membuat…')
    : (isEdit ? 'Simpan Perubahan' : 'Buat Akun')

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent
        onInteractOutside={e => { if (isPending || isDeletePending) e.preventDefault() }}
        onEscapeKeyDown={e => { if (isPending || isDeletePending) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Akun' : 'Tambah Akun Baru'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Perbarui informasi dan role pengguna ini.'
              : 'Buat akun baru untuk operator atau super admin.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-3 mt-1">

          {/* Organisation Name */}
          <div className="space-y-1">
            <Label htmlFor="modal-org-name">
              Nama Organisasi / Unit <span className="text-red-500" aria-hidden>*</span>
            </Label>
            <Input
              id="modal-org-name"
              name="organisationName"
              // autoFocus replaces useRef — Input doesn't expose a ref
              autoFocus
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="cth. UKM Karate IPB"
              autoComplete="organization"
              maxLength={100}
              disabled={isPending}
              required
            />
          </div>

          {/* Email — read-only in edit mode (it's the auth identifier) */}
          <div className="space-y-1">
            <Label htmlFor="modal-email">
              Email Akun (Google)
              {!isEdit && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
            </Label>
            {isEdit ? (
              <div className="flex h-8 w-full items-center rounded-md border border-input bg-muted px-3 text-xs text-muted-foreground select-all">
                {email}
              </div>
            ) : (
              <Input
                id="modal-email"
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@apps.ipb.ac.id"
                autoComplete="email"
                maxLength={254}
                disabled={isPending}
                required
              />
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Email tidak bisa diubah — digunakan sebagai login Google.
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1">
            <Label htmlFor="modal-role">
              Role <span className="text-red-500" aria-hidden>*</span>
            </Label>
            <Select
              name="role"
              value={role}
              onValueChange={v => setRole(v as typeof role)}
              disabled={isPending || selfRoleLocked}
            >
              <SelectTrigger id="modal-role">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {selfRoleLocked && (
              <p className="text-xs text-muted-foreground">
                Kamu tidak bisa mengubah role akunmu sendiri.
              </p>
            )}
          </div>

          {/* Feedback */}
          {error && <InlineError message={error} />}
          {success && <InlineSuccess message={success} />}

          {/* Footer */}
          <div className={`flex items-center pt-1 gap-2 ${isEdit && !isSelf ? 'justify-between' : 'justify-end'}`}>

            {/* Delete — only in edit mode, not for own account */}
            {isEdit && !isSelf && (
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="noBorder"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                    disabled={isPending || isDeletePending}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Hapus Akun
                  </Button>
                }
                title="Hapus Akun"
                description={`Akun ${user?.email ?? ''} akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.`}
                confirmLabel="Ya, Hapus"
                variant="destructive"
                onConfirm={handleDeleteConfirm}
              />
            )}

            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="noBorder"
                onClick={handleClose}
                disabled={isPending || isDeletePending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="filled"
                disabled={isPending || isDeletePending}
              >
                {submitLabel}
              </Button>
            </div>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}