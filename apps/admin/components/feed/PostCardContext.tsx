import React, { createContext, useContext } from 'react';

export const PostCardMediaContext = createContext<any>(null);
export const PostCardActionContext = createContext<any>(null);
export const PostCardContentContext = createContext<any>(null);

export const usePostCardMediaContext = () => {
  const context = useContext(PostCardMediaContext);
  if (!context) throw new Error("Must be used within PostCardMediaContext");
  return context;
};

export const usePostCardActionContext = () => {
  const context = useContext(PostCardActionContext);
  if (!context) throw new Error("Must be used within PostCardActionContext");
  return context;
};

export const usePostCardContentContext = () => {
  const context = useContext(PostCardContentContext);
  if (!context) throw new Error("Must be used within PostCardContentContext");
  return context;
};
