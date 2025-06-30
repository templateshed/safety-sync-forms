
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface FolderSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  label?: string;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  value,
  onValueChange,
  label = "Folder"
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Label htmlFor="folder">{label}</Label>
      <Select
        value={value || "none"}
        onValueChange={(val) => onValueChange(val === "none" ? null : val)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a folder" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Folder</SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: folder.color }}
                />
                {folder.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
