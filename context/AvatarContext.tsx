import { createContext, useContext, useEffect, useState } from "react";
import { getUsuario, initDB, updateUsuario } from "../database/database";
import { EstadoAvatar } from "../types/avatar";
import { AVATAR_DEFAULT } from "../utils/avatarDicebear";

type AvatarContextType = {
  avatar: EstadoAvatar;
  updateAvatar: (field: keyof EstadoAvatar, value: string) => void;
};

const AvatarContext = createContext<AvatarContextType | null>(null);

export const AvatarProvider = ({ children }: any) => {
  const [avatar, setAvatar] = useState<EstadoAvatar>(AVATAR_DEFAULT);

  useEffect(() => {
    (async () => {
      await initDB();
      const row = (await getUsuario()) as any;
      if (row) {
        setAvatar({
          skinColor: row.skinColor ?? AVATAR_DEFAULT.skinColor,
          hair: row.hair ?? AVATAR_DEFAULT.hair,
          hairColor: row.hairColor ?? AVATAR_DEFAULT.hairColor,
          rearHair: row.rearHair ?? AVATAR_DEFAULT.rearHair,
          eyebrows: row.eyebrows ?? AVATAR_DEFAULT.eyebrows,
          eyes: row.eyes ?? AVATAR_DEFAULT.eyes,
          mouth: row.mouth ?? AVATAR_DEFAULT.mouth,
          beard: row.beard ?? AVATAR_DEFAULT.beard,
          clothes: row.clothes ?? AVATAR_DEFAULT.clothes,
          clothesColor: row.clothesColor ?? AVATAR_DEFAULT.clothesColor,
        });
      }
    })();
  }, []);

  const updateAvatar = (field: keyof EstadoAvatar, value: string) => {
    setAvatar((prev) => {
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
  if (!context) throw new Error("useAvatar must be used inside AvatarProvider");
  return context;
};
