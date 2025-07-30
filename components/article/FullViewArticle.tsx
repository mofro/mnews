'use client';

import { X } from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useEffect } from 'react';

interface FullViewArticleProps {
  article: {
    id: string;
    title: string;
    content: string;
    publishDate: string;
  };
  onClose: () => void;
  className?: string;
}

export function FullViewArticle({ article, onClose, className }: FullViewArticleProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
          <div 
            className={cn(
              'relative w-full max-w-4xl rounded-xl bg-white shadow-2xl',
              'transform transition-all duration-300',
              'max-h-[90vh] overflow-y-auto',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            <article className="prose prose-lg mx-auto p-6 sm:p-8">
              <header className="mb-8">
                <h1 className="text-3xl font-bold sm:text-4xl" id="modal-title">
                  {article.title}
                </h1>
                <div className="mt-2 text-sm text-gray-500">
                  {format(new Date(article.publishDate), 'MMMM d, yyyy')}
                </div>
              </header>
              
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </article>
          </div>
        </div>
      </div>
    </Portal>
  );
}
