'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Camera, Users, Lock, Globe, Trash2, UserPlus, LogOut, ShieldCheck, Shield, MoreVertical, Check } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { resizeImage } from '@/lib/image';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';

interface Member { id: string; name: string; username: string; avatar: string; role: 'admin' | 'member' }
interface GroupDetail { id: string; name: string; description: string; image: string; privacy: 'private' | 'discoverable'; participants: string[]; adminIds: string[]; members: Member[]; isAdmin: boolean }

export default function ManageGroupModal({ groupId, onClose, onLeftOrDeleted }: { groupId: string; onClose: () => void; onLeftOrDeleted: () => void }) {
  const { currentUser, connections, getUserById, groupAction, deleteGroup } = useApp();
  const { confirm, toast } = useFeedback();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'members' | 'add'>('info');
  const [busy, setBusy] = useState(false);

  // Editable info state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'discoverable'>('private');
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [addSelected, setAddSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/conversations/${groupId}`, { credentials: 'include' });
      if (r.ok) {
        const d: GroupDetail = await r.json();
        setGroup(d);
        setName(d.name || '');
        setDescription(d.description || '');
        setPrivacy(d.privacy);
        setImagePreview(d.image || '');
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;
    let file = original;
    try { file = await resizeImage(original, 512, 0.85); } catch { file = original; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageFile) return undefined;
    try {
      const fd = new FormData(); fd.append('file', imageFile);
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
      if (r.ok) return (await r.json()).url;
    } catch { /* ignore */ }
    return undefined;
  };

  const saveInfo = async () => {
    if (!name.trim()) { toast('Group name cannot be empty', 'error'); return; }
    setBusy(true);
    const image = await uploadImage();
    const body: Record<string, unknown> = { action: 'updateInfo', name: name.trim(), description: description.trim(), privacy };
    if (image !== undefined) body.image = image;
    const ok = await groupAction(groupId, body);
    setBusy(false);
    if (ok) { toast('Group updated', 'success'); load(); } else { toast('Could not update group', 'error'); }
  };

  const removeMember = async (m: Member) => {
    const ok = await confirm({ title: `Remove ${m.name}?`, message: 'Remove this member from the group?', confirmText: 'Remove', destructive: true });
    if (!ok) return;
    const done = await groupAction(groupId, { action: 'removeMember', userId: m.id });
    if (done) { toast(`${m.name} removed`, 'success'); load(); } else toast('Could not remove member', 'error');
  };

  const promote = async (m: Member) => {
    const done = await groupAction(groupId, { action: 'promote', userId: m.id });
    if (done) { toast(`${m.name} is now an admin`, 'success'); load(); } else toast('Action failed', 'error');
  };
  const demote = async (m: Member) => {
    const done = await groupAction(groupId, { action: 'demote', userId: m.id });
    if (done) { toast(`${m.name} is no longer an admin`, 'success'); load(); } else toast('Action failed', 'error');
  };

  const addMembers = async () => {
    if (addSelected.length === 0) return;
    setBusy(true);
    const done = await groupAction(groupId, { action: 'addMembers', userIds: addSelected });
    setBusy(false);
    if (done) { toast('Members added', 'success'); setAddSelected([]); setTab('members'); load(); } else toast('Could not add members', 'error');
  };

  const leaveGroup = async () => {
    const ok = await confirm({ title: 'Leave group?', message: 'You will no longer receive messages from this group.', confirmText: 'Leave', destructive: true });
    if (!ok) return;
    const done = await groupAction(groupId, { action: 'leave' });
    if (done) { toast('You left the group'); onLeftOrDeleted(); } else toast('Could not leave the group', 'error');
  };

  const doDelete = async () => {
    const ok = await confirm({ title: 'Delete Group?', message: 'This will permanently delete the group and its group conversation. This cannot be undone.', confirmText: 'Delete Group', destructive: true });
    if (!ok) return;
    const done = await deleteGroup(groupId);
    if (done) { toast('Group deleted'); onLeftOrDeleted(); } else toast('Could not delete the group', 'error');
  };

  // Friends who aren't already members — candidates to add.
  const memberIds = new Set(group?.participants || []);
  const addableFriends = (connections[currentUser.id] || [])
    .map(id => getUserById(id))
    .filter((u): u is NonNullable<typeof u> => !!u && !memberIds.has(u.id));

  const isAdmin = !!group?.isAdmin;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-lg">{isAdmin ? 'Manage Group' : 'Group Info'}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>

        {loading || !group ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="p-5">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTab('info')} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${tab === 'info' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Info</button>
              <button onClick={() => setTab('members')} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${tab === 'members' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Members ({group.members.length})</button>
              {isAdmin && <button onClick={() => setTab('add')} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${tab === 'add' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Add</button>}
            </div>

            {/* INFO */}
            {tab === 'info' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {imagePreview
                    ? <img src={imagePreview} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                    : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center"><Users size={26} className="text-white" /></div>}
                  {isAdmin && <label className="btn-secondary text-sm cursor-pointer flex items-center gap-1"><Camera size={14} /> Change<input type="file" accept="image/*" onChange={handleImage} className="hidden" /></label>}
                </div>

                {isAdmin ? (
                  <>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Group name</label>
                    <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="input-field mb-3" />
                    <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                    <textarea value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-field resize-none mb-3" />
                    <label className="text-xs font-medium text-gray-600 block mb-2">Privacy</label>
                    <div className="space-y-2 mb-4">
                      <button type="button" onClick={() => setPrivacy('private')} className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left ${privacy === 'private' ? 'border-campus-primary bg-campus-primary/5' : 'border-gray-200'}`}>
                        <Lock size={16} className={privacy === 'private' ? 'text-campus-primary mt-0.5' : 'text-gray-400 mt-0.5'} />
                        <div><p className="text-sm font-medium">Private</p><p className="text-xs text-gray-500">Only invited or added members can access this group.</p></div>
                      </button>
                      <button type="button" onClick={() => setPrivacy('discoverable')} className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left ${privacy === 'discoverable' ? 'border-campus-primary bg-campus-primary/5' : 'border-gray-200'}`}>
                        <Globe size={16} className={privacy === 'discoverable' ? 'text-campus-primary mt-0.5' : 'text-gray-400 mt-0.5'} />
                        <div><p className="text-sm font-medium">Discoverable</p><p className="text-xs text-gray-500">Other VYBE users can find this group and join.</p></div>
                      </button>
                    </div>
                    <button onClick={saveInfo} disabled={busy} className="btn-primary w-full disabled:opacity-50 mb-3">{busy ? 'Saving…' : 'Save changes'}</button>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg">{group.name}</p>
                    {group.description && <p className="text-sm text-gray-600 mt-1">{group.description}</p>}
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">{group.privacy === 'discoverable' ? <><Globe size={12} /> Discoverable</> : <><Lock size={12} /> Private</>}</p>
                  </>
                )}

                {/* Danger zone */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <button onClick={leaveGroup} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"><LogOut size={15} /> Leave group</button>
                  {isAdmin && <button onClick={doDelete} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100"><Trash2 size={15} /> Delete group</button>}
                </div>
              </div>
            )}

            {/* MEMBERS */}
            {tab === 'members' && (
              <div className="space-y-1">
                {group.members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                    <Avatar src={m.avatar} name={m.name} size={38} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}{m.id === currentUser.id && ' (you)'}</p>
                      <p className={`text-[11px] ${m.role === 'admin' ? 'text-campus-primary font-medium' : 'text-gray-400'}`}>{m.role === 'admin' ? 'Admin' : 'Member'}</p>
                    </div>
                    {isAdmin && m.id !== currentUser.id && (
                      <MemberMenu member={m} onRemove={() => removeMember(m)} onPromote={() => promote(m)} onDemote={() => demote(m)} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ADD MEMBERS (admin) */}
            {tab === 'add' && isAdmin && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Add friends ({addSelected.length} selected)</p>
                {addableFriends.length > 0 ? (
                  <div className="space-y-1 max-h-56 overflow-y-auto mb-4">
                    {addableFriends.map(f => (
                      <button key={f.id} onClick={() => setAddSelected(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])} className={`w-full flex items-center gap-3 p-2 rounded-xl ${addSelected.includes(f.id) ? 'bg-campus-primary/10' : 'hover:bg-gray-50'}`}>
                        <Avatar src={f.avatar} name={f.name} size={36} />
                        <span className="flex-1 text-left text-sm font-medium truncate">{f.name}</span>
                        {addSelected.includes(f.id) && <Check size={16} className="text-campus-primary" />}
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400 mb-4">All your friends are already in this group.</p>}
                <button onClick={addMembers} disabled={busy || addSelected.length === 0} className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-1"><UserPlus size={15} /> Add selected</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberMenu({ member, onRemove, onPromote, onDemote }: { member: Member; onRemove: () => void; onPromote: () => void; onDemote: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Member options" className="p-1.5 rounded-lg hover:bg-gray-100"><MoreVertical size={16} className="text-gray-400" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-20 w-40">
            {member.role === 'member'
              ? <button onClick={() => { setOpen(false); onPromote(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><ShieldCheck size={14} /> Make admin</button>
              : <button onClick={() => { setOpen(false); onDemote(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Shield size={14} /> Remove admin</button>}
            <button onClick={() => { setOpen(false); onRemove(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Remove member</button>
          </div>
        </>
      )}
    </div>
  );
}
