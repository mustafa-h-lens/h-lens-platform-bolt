import { useState, useEffect, useRef } from 'react';
import { Plus, Folder, File, Download, Trash2, FileText, Image, FileArchive } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatDateArabic } from '../../../../lib/formatters';
import { useNotification } from '../../../../contexts/NotificationContext';
import { ConfirmationModal } from '../../../shared/ConfirmationModal';
import { useAuth } from '../../../../contexts/AuthContext';

interface ProjectFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

interface ProjectFilesProps {
  projectId: string;
}

export const ProjectFiles = ({ projectId }: ProjectFilesProps) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    loadFiles();
  }, [projectId]);

  const loadFiles = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `projects/${projectId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(filePath);

      // Determine file category
      const mimeType = file.type;
      let fileType = 'other';
      if (mimeType.includes('pdf')) fileType = 'contract';
      else if (mimeType.startsWith('image/')) fileType = 'other';

      // Insert record in project_files
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_type: fileType,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: mimeType,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      showSuccess('تم رفع الملف بنجاح');
      loadFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showError(error.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setUploading(false);
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      // Find the file to get its storage path
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error('الملف غير موجود');

      // Extract storage path from the public URL
      const bucketName = 'vendor-images';
      const urlParts = file.file_url.split(`/storage/v1/object/public/${bucketName}/`);
      if (urlParts.length === 2) {
        const storagePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from(bucketName).remove([storagePath]);
      }

      // Delete the DB record
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      showSuccess('تم حذف الملف بنجاح');
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      showError('حدث خطأ أثناء حذف الملف');
    } finally {
      setDeleteFileId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return Image;
    } else if (fileType.includes('pdf')) {
      return FileText;
    } else if (fileType.includes('zip') || fileType.includes('rar')) {
      return FileArchive;
    }
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="text-center text-slate-600 py-8">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
            border border-[#0A2A66]/20">
            <Folder className="w-5 h-5 text-[#0A2A66]" />
          </div>
          ملفات المشروع
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          accept="image/jpeg,image/png,image/webp"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
            text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{uploading ? 'جاري الرفع...' : 'رفع ملف'}</span>
        </button>
      </div>

      {files.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700
            flex items-center justify-center">
            <Folder className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">لا توجد ملفات في هذا المشروع</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.file_type);

            return (
              <div
                key={file.id}
                className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-6
                  hover:shadow-lg transition-all group"
              >
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
                    dark:from-[#0A2A66]/20 dark:to-[#1B4FA9]/20
                    border border-[#0A2A66]/20 dark:border-[#0A2A66]/30 flex items-center justify-center
                    group-hover:scale-110 transition-transform">
                    <FileIcon className="w-10 h-10 text-[#0A2A66] dark:text-[#47A1FF]" strokeWidth={1.5} />
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 text-center mb-1 line-clamp-2
                    min-h-[2.5rem]">
                    {file.file_name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4" dir="ltr">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{formatDateArabic(file.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => window.open(file.file_url, '_blank')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2
                        bg-slate-100 dark:bg-slate-700 text-[#0A2A66] dark:text-[#47A1FF]
                        rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل</span>
                    </button>
                    <button
                      onClick={() => setDeleteFileId(file.id)}
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400
                        rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteFileId}
        title="حذف الملف"
        message="هل أنت متأكد من حذف هذا الملف؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={() => deleteFileId && handleDelete(deleteFileId)}
        onCancel={() => setDeleteFileId(null)}
      />
    </div>
  );
};
