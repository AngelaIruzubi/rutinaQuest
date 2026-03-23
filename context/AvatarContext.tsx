import { createContext, useContext, useEffect, useState } from 'react';
import { getUsuario, initDB, updateUsuario } from '../database/database';

type AvatarType = {
  cara: number;
  ojos: number;
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
    ojos: 0,
    peloCorto: 0,
    peloLargo: -1,
    shirt: 0,
  });

  useEffect(() => {
    initDB();
    const row = getUsuario();
    if (row) {
      setAvatar({
        cara:      row.cara      ?? 0,
        ojos:      row.ojos      ?? 0,
        peloCorto: row.peloCorto ?? 0,
        peloLargo: row.peloLargo ?? -1,
        shirt:     row.shirt     ?? 0,
      });
    }
  }, []);

  const updateAvatar = (field: keyof AvatarType, value: number) => {
    setAvatar(prev => {
      const next = { ...prev, [field]: value };
      updateUsuario(next);
      return next;
    });
  };

  return (
    <AvatarContext.Provider value={{ avatar, updateAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => {
  const context = useContext(AvatarContext);
  if (!context) throw new Error('useAvatar must be used inside AvatarProvider');
  return context;
};