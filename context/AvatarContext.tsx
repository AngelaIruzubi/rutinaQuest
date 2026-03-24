import { createContext, useContext, useEffect, useState } from 'react';
import { getUsuario, initDB, updateUsuario } from '../database/database';

export type AvatarType = {
  tonoPiel:  number;  // 0 = claro, 1 = oscuro
  cara:      number;  // 0-2
  ojos:      number;  // 0-3 color
  colorPelo: number;  // 0-3 color
  peloCorto: number;  // índice o -1
  peloLargo: number;  // índice o -1
  shirt:     number;  // 0-1
};

type AvatarContextType = {
  avatar: AvatarType;
  updateAvatar: (field: keyof AvatarType, value: number) => void;
};

const AvatarContext = createContext<AvatarContextType | null>(null);

export const AvatarProvider = ({ children }: any) => {
  const [avatar, setAvatar] = useState<AvatarType>({
    tonoPiel:  0,
    cara:      0,
    ojos:      0,
    colorPelo: 0,
    peloCorto: 0,
    peloLargo: -1,
    shirt:     0,
  });

  useEffect(() => {
    initDB();
    const row = getUsuario() as any;
    if (row) {
      setAvatar({
        tonoPiel:  row.tonoPiel  ?? 0,
        cara:      row.cara      ?? 0,
        ojos:      row.ojos      ?? 0,
        colorPelo: row.colorPelo ?? 0,
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