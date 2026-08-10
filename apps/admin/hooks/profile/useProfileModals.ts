import { useState } from 'react';

export function useProfileModals() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Estados do cropper, centralizando-os nos modais
  const [cropperFile, setCropperFile] = useState<string | null>(null);
  const [cropperConfig, setCropperConfig] = useState<{
    aspect: number;
    title: string;
    isCircular: boolean;
    type: 'avatar' | 'banner';
  } | null>(null);

  // Controle do destaque atual sendo editado
  const [editingHighlight, setEditingHighlight] = useState<any | null>(null);

  const openCropper = (file: string, config: any) => {
    setCropperFile(file);
    setCropperConfig(config);
  };

  const closeCropper = () => {
    if (cropperFile && cropperFile.startsWith('blob:')) {
      URL.revokeObjectURL(cropperFile);
    }
    setCropperFile(null);
    setCropperConfig(null);
  };

  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  return {
    isEditModalOpen, setIsEditModalOpen, openEditModal, closeEditModal,
    isHighlightModalOpen, setIsHighlightModalOpen,
    isStoryViewerOpen, setIsStoryViewerOpen,
    isStoryCreatorOpen, setIsStoryCreatorOpen,
    isVerificationModalOpen, setIsVerificationModalOpen,
    isShareModalOpen, setIsShareModalOpen,
    cropperFile, setCropperFile,
    cropperConfig, setCropperConfig,
    openCropper, closeCropper,
    editingHighlight, setEditingHighlight,
  };
}
