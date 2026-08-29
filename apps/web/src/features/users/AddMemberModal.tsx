import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type { UserCreate } from '../../types/api';

export interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdName: string;
  onSubmit: (payload: UserCreate) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, householdName, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+92');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setPhone('+92');
    setEmail('');
    setRole('MEMBER');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit({
        full_name: name.trim(),
        phone_number: phone.trim(),
        email: email.trim() || null,
        role,
      });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={<span className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-emerald-400" /> Add member</span>}
      description={`New member of ${householdName}.`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close} disabled={isLoading}>Cancel</Button>
          <Button variant="emerald" size="sm" onClick={handleSubmit} isLoading={isLoading}>Add</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bilal" autoFocus />
        <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+923001234567" />
        <Input label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="bilal@example.com" />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
          error={error ?? undefined}
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </form>
    </Modal>
  );
};
