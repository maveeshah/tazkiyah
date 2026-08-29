import React, { useState, useEffect } from 'react';
import { FolderPlus } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { EnvelopeGroupCreate } from '../../types/api';

export interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Omit<EnvelopeGroupCreate, 'household_id'>) => Promise<unknown>;
  existingGroupsCount?: number;
}

export const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingGroupsCount = 0,
}) => {
  const [name, setName] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>(String(existingGroupsCount + 1));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName('');
      setSortOrder(String(existingGroupsCount + 1));
    }
  }, [isOpen, existingGroupsCount]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }

    const orderNum = parseInt(sortOrder, 10);

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        sort_order: isNaN(orderNum) ? existingGroupsCount + 1 : orderNum,
      });
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create envelope group';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const groupSuggestions = [
    'Daily Living Essentials',
    'Utilities & Recurring Bills',
    'Transportation & Fuel',
    'Discretionary & Lifestyle',
    'Savings & Sinking Funds',
    'Debt & Obligations',
    'Charity & Zakat',
    'Family & Education',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-emerald-400" />
          Add Envelope Group
        </span>
      }
      description="Organize your envelopes into thematic high-level budget categories."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Quick Suggestions */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Suggested Groups:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {groupSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setName(suggestion);
                  setError(null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Group Name */}
        <Input
          label="Group Name"
          placeholder="e.g. Daily Living Essentials"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          required
          autoFocus
        />

        {/* Sort Order (Optional) */}
        <Input
          label="Sort Order Index"
          type="number"
          min="1"
          placeholder="1"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          helperText="Determines display position of this group in the budget table."
        />

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="emerald"
            size="sm"
            isLoading={isLoading}
            leftIcon={<FolderPlus className="w-4 h-4" />}
          >
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
