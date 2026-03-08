import { createContext, useContext, useState } from 'react';

type AvatarType = {
  cara: number;
  eyes: number;
  peloCorto: number;
  peloLargo: number;
  shirt: number;
};

type AvatarContextType = {
  avatar: AvatarType;
  updateAvatar: (field: keyof AvatarType, value: number) => void;
};

const AvatarContext = createContext<AvatarContextType | null>(null);

export const AvatarProvider = ({ children }: any) => {
  const [avatar, setAvatar] = useState<AvatarType>({
    cara: 0,
    eyes: 0,
    peloCorto: 0,
    peloLargo: -1,
    shirt: 0,
  });

  const updateAvatar = (field: keyof AvatarType, value: number) => {
    setAvatar(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <AvatarContext.Provider value={{ avatar, updateAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used inside AvatarProvider');
  }
  return context;
};