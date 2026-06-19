import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';

interface RecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: {
    id: string;
    name: string;
    description: string;
  };
}

export function RecipeDialog({ isOpen, onClose, recipe }: RecipeDialogProps) {
  const cleanDescription = DOMPurify.sanitize(recipe.description);
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{recipe.name}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div dangerouslySetInnerHTML={ __html: cleanDescription } />
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}