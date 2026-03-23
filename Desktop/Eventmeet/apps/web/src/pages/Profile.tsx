import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, MapPin, Phone, Calendar, Edit3, Save, X,
  CheckCircle, Star, Camera, Loader2, Plus, Tag,
  Heart, Shield, Clock
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

interface OwnProfile {
  id: string
  email: string
  fullName: string
  username: string | null
  bio: string | null
  dateOfBirth: string | null
  gender: string | null
  phoneNumber: string | null
  avatarUrl: string | null
  city: string | null
  state: string | null
  interests: string[]
  lookingFor: string[]
  isVerified: boolean
  averageRating: number | null
  totalRatings: number
  lastLoginAt: string | null
  createdAt: string
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  'non-binary': 'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
}

export default function Profile() {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore(s => s.updateUser)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<OwnProfile>>({})
  const [interestInput, setInterestInput] = useState('')
  const [lookingForInput, setLookingForInput] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: profile, isLoading } = useQuery<OwnProfile>({
    queryKey: ['profile-me'],
    queryFn: async () => {
      const res = await api.get('/users/me')
      return res.data.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<OwnProfile>) => {
      const res = await api.patch('/users/me', payload)
      return res.data.data as OwnProfile
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile-me'], updated)
      updateUser({ fullName: updated.fullName, avatarUrl: updated.avatarUrl })
      setEditing(false)
    },
  })

  function startEdit() {
    if (!profile) return
    setForm({
      fullName:    profile.fullName,
      username:    profile.username ?? '',
      bio:         profile.bio ?? '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
      gender:      profile.gender ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      city:        profile.city ?? '',
      state:       profile.state ?? '',
      interests:   [...profile.interests],
      lookingFor:  [...profile.lookingFor],
    })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setInterestInput('')
    setLookingForInput('')
  }

  function handleSave() {
    const payload: Record<string, unknown> = {}
    const fields = ['fullName', 'username', 'bio', 'dateOfBirth', 'gender', 'phoneNumber', 'city', 'state', 'interests', 'lookingFor'] as const
    for (const key of fields) {
      const val = form[key]
      if (val !== undefined && val !== '') payload[key] = val
    }
    updateMutation.mutate(payload as Partial<OwnProfile>)
  }

  function addChip(field: 'interests' | 'lookingFor', val: string) {
    const trimmed = val.trim()
    if (!trimmed) return
    const current = (form[field] ?? []) as string[]
    if (!current.includes(trimmed)) {
      setForm(f => ({ ...f, [field]: [...current, trimmed] }))
    }
    if (field === 'interests') setInterestInput('')
    else setLookingForInput('')
  }

  function removeChip(field: 'interests' | 'lookingFor', chip: string) {
    const current = (form[field] ?? []) as string[]
    setForm(f => ({ ...f, [field]: current.filter(c => c !== chip) }))
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await api.post('/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { avatarUrl } = res.data.data
      queryClient.setQueryData<OwnProfile>(['profile-me'], old => old ? { ...old, avatarUrl } : old)
      updateUser({ avatarUrl })
    } catch {
      // avatar upload failed silently — Cloudinary may not be configured
    } finally {
      setAvatarLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-violet animate-spin" />
    </div>
  )

  if (!profile) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-text-secondary">Could not load profile.</p>
    </div>
  )

  const rating = profile.averageRating ? Number(profile.averageRating).toFixed(1) : null

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* Header card */}
      <div className="card relative overflow-hidden">
        {/* gradient strip */}
        <div className="h-24 -mx-5 -mt-5 mb-0 bg-gradient-brand opacity-20 absolute inset-x-0 top-0" />

        <div className="relative pt-4 flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-4 ring-base">
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                : <span>{getInitials(profile.fullName)}</span>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet flex items-center justify-center hover:bg-violet-light transition-colors"
            >
              {avatarLoading
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Camera className="w-3.5 h-3.5 text-white" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary leading-tight">{profile.fullName}</h1>
              {profile.isVerified && (
                <span title="Verified" className="flex items-center gap-1 text-xs text-violet-light">
                  <CheckCircle className="w-4 h-4" /> Verified
                </span>
              )}
            </div>
            {profile.username && (
              <p className="text-text-secondary text-sm">@{profile.username}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-disabled pt-0.5">
              {rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {rating} ({profile.totalRatings} ratings)
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Joined {formatDate(profile.createdAt)}
              </span>
              {(profile.city || profile.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[profile.city, profile.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          {!editing && (
            <button onClick={startEdit} className="btn btn-secondary text-sm flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0">
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!editing ? (
          /* ── VIEW MODE ── */
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Bio */}
            {profile.bio && (
              <div className="card space-y-1">
                <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">About</h2>
                <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Personal info */}
            <div className="card space-y-3">
              <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Personal Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={<User className="w-4 h-4 text-violet" />} label="Email" value={profile.email} />
                {profile.phoneNumber && <InfoRow icon={<Phone className="w-4 h-4 text-violet" />} label="Phone" value={profile.phoneNumber} />}
                {profile.dateOfBirth && <InfoRow icon={<Calendar className="w-4 h-4 text-violet" />} label="Birthday" value={formatDate(profile.dateOfBirth)} />}
                {profile.gender && <InfoRow icon={<Shield className="w-4 h-4 text-violet" />} label="Gender" value={GENDER_LABELS[profile.gender] ?? profile.gender} />}
              </div>
            </div>

            {/* Interests */}
            {profile.interests.length > 0 && (
              <div className="card space-y-3">
                <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Interests
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(tag => (
                    <span key={tag} className="badge badge-violet text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Looking for */}
            {profile.lookingFor.length > 0 && (
              <div className="card space-y-3">
                <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" /> Looking For
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.lookingFor.map(tag => (
                    <span key={tag} className="badge badge-pink text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state if profile is bare */}
            {!profile.bio && profile.interests.length === 0 && profile.lookingFor.length === 0 && !profile.phoneNumber && (
              <div className="card text-center py-8 space-y-2">
                <User className="w-10 h-10 text-text-disabled mx-auto" />
                <p className="text-text-secondary text-sm">Your profile is looking a bit empty.</p>
                <button onClick={startEdit} className="btn btn-primary text-sm">Complete your profile</button>
              </div>
            )}
          </motion.div>
        ) : (
          /* ── EDIT MODE ── */
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Basic info */}
            <div className="card space-y-4">
              <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Basic Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Full Name">
                  <input className="input text-sm" value={form.fullName ?? ''} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} maxLength={100} />
                </FormField>
                <FormField label="Username">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled text-sm">@</span>
                    <input
                      className="input text-sm pl-7"
                      value={form.username ?? ''}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
                      maxLength={50}
                      placeholder="your_handle"
                    />
                  </div>
                </FormField>
              </div>
              <FormField label="Bio">
                <textarea
                  className="input text-sm resize-none"
                  rows={3}
                  value={form.bio ?? ''}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  maxLength={500}
                  placeholder="Tell people a bit about yourself..."
                />
              </FormField>
            </div>

            {/* Personal details */}
            <div className="card space-y-4">
              <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Personal Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Date of Birth">
                  <input
                    type="date"
                    className="input text-sm"
                    value={(form.dateOfBirth as string) ?? ''}
                    onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  />
                </FormField>
                <FormField label="Gender">
                  <select
                    className="input text-sm"
                    value={form.gender ?? ''}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  >
                    <option value="">Select gender</option>
                    {Object.entries(GENDER_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Phone Number">
                  <input
                    className="input text-sm"
                    value={form.phoneNumber ?? ''}
                    onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                    placeholder="+91 9876543210"
                  />
                </FormField>
                <FormField label="City">
                  <input
                    className="input text-sm"
                    value={form.city ?? ''}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Mumbai"
                  />
                </FormField>
                <FormField label="State">
                  <input
                    className="input text-sm"
                    value={form.state ?? ''}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    placeholder="Maharashtra"
                  />
                </FormField>
              </div>
            </div>

            {/* Interests */}
            <div className="card space-y-3">
              <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Interests
                <span className="text-text-disabled font-normal normal-case ml-auto">{(form.interests as string[])?.length ?? 0}/20</span>
              </h2>
              <ChipInput
                chips={(form.interests as string[]) ?? []}
                inputVal={interestInput}
                onInputChange={setInterestInput}
                onAdd={() => addChip('interests', interestInput)}
                onRemove={(c) => removeChip('interests', c)}
                placeholder="Add interest (press Enter)"
                badgeClass="badge-violet"
              />
            </div>

            {/* Looking For */}
            <div className="card space-y-3">
              <h2 className="text-xs font-semibold text-text-disabled uppercase tracking-wide flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" /> Looking For
                <span className="text-text-disabled font-normal normal-case ml-auto">{(form.lookingFor as string[])?.length ?? 0}/10</span>
              </h2>
              <ChipInput
                chips={(form.lookingFor as string[]) ?? []}
                inputVal={lookingForInput}
                onInputChange={setLookingForInput}
                onAdd={() => addChip('lookingFor', lookingForInput)}
                onRemove={(c) => removeChip('lookingFor', c)}
                placeholder="e.g. Friends, Networking, Dating"
                badgeClass="badge-pink"
              />
            </div>

            {/* Error */}
            {updateMutation.isError && (
              <p className="text-pink text-sm text-center">
                {(updateMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update profile. Try again.'}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
              >
                {updateMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Save className="w-4 h-4" /> Save Changes</>
                }
              </button>
              <button onClick={cancelEdit} disabled={updateMutation.isPending} className="btn btn-ghost border border-border text-sm px-5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Sub-components ── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-violet/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-text-disabled text-xs">{label}</p>
        <p className="text-text-primary text-sm">{value}</p>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-secondary font-medium">{label}</label>
      {children}
    </div>
  )
}

function ChipInput({
  chips, inputVal, onInputChange, onAdd, onRemove, placeholder, badgeClass,
}: {
  chips: string[]
  inputVal: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (c: string) => void
  placeholder: string
  badgeClass: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <span key={chip} className={cn('badge flex items-center gap-1 text-xs', badgeClass)}>
            {chip}
            <button onClick={() => onRemove(chip)} className="ml-0.5 hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input text-sm flex-1"
          value={inputVal}
          onChange={e => onInputChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
        />
        <button onClick={onAdd} className="btn btn-ghost border border-border px-3">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
