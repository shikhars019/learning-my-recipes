import React from 'react';
import { useParams } from 'react-router-dom';
import CreateEditRecipePage from './CreateEditRecipePage';

function EditRecipePage() {
  const { id } = useParams();
  
  return <CreateEditRecipePage mode="edit" recipeId={id} />;
}

export default EditRecipePage;