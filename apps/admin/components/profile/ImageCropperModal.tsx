"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, Check, ZoomIn, ZoomOut } from "lucide-react";
import { getCroppedImg } from "@/lib/image-utils";

interface ImageCropperModalProps {
  image: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
  aspect: number;
  title: string;
  isCircular?: boolean;
}

export function ImageCropperModal({ 
  image, 
  isOpen, 
  onClose, 
  onCropComplete, 
  aspect, 
  title,
  isCircular = false 
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: any) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao recortar imagem");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-[#0f0f0f] border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[32px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button 
            onClick={handleDone}
            className="bg-whatsapp-green text-whatsapp-dark px-6 py-2 rounded-xl text-sm font-black hover:bg-whatsapp-greenLight transition-all active:scale-95 flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Aplicar
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative w-full h-[350px] sm:h-[450px] bg-black overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
            cropShape={isCircular ? "round" : "rect"}
            showGrid={true}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
              }
            }}
          />
        </div>

        {/* Controls */}
        <div className="p-6 bg-white/5">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-gray-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e: any) => onZoomChange(e.target.value)}
              className="flex-1 accent-whatsapp-green h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-center text-[10px] text-gray-500 mt-4 uppercase font-bold tracking-widest">
            Arraste para posicionar • Use o slider para dar zoom
          </p>
        </div>
      </div>
    </div>
  );
}
