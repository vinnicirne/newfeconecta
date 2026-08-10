import React, { createContext, useContext } from 'react';

export const PostCardContext = createContext<any>(null);

export const usePostCardContext = () => {
  const context = useContext(PostCardContext);
  if (!context) {
    throw new Error("usePostCardContext must be used within a PostCardContext.Provider");
  }
  return context;
};
