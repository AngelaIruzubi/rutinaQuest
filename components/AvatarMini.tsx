import { Image, View } from 'react-native';
import { useAvatar } from '../context/AvatarContext';

// ⚠️ Debe coincidir exactamente con COLORES_PELO de perfil.tsx
const COLORES_PELO = ['#1a1a1a', '#3B1F0E', '#8B4513', '#DAA520', '#E8C47A', '#E8E8E8'];

function skinIndex(tonoPiel: number): 0 | 1 {
  return tonoPiel >= 3 ? 1 : 0;
}

export default function AvatarMini() {
  const { avatar } = useAvatar();
  const { tonoPiel, cara, colorPelo, peloCorto, peloLargo, shirt } = avatar;
  const si = skinIndex(tonoPiel);

  const avatarConfig = {
    cara:      { top: -85,  left: -85, zIndex: 1, scale: 0.15 },
    peloCorto: { top: -73,  left: -72, scale: 0.17, zIndex: 2 },
    peloLargo: { top: -110, left: -85, scale: 0.15, zIndex: 4 },
    shirt:     { top: -77,  left: -13, scale: 0.15, zIndex: 5 },
  };

  const caras = [
    [
      require('../assets/images/avatar/cara1_claro.png'),
      require('../assets/images/avatar/cara2_claro.png'),
      require('../assets/images/avatar/cara3_claro.png'),
    ],
    [
      require('../assets/images/avatar/cara1_oscuro.png'),
      require('../assets/images/avatar/cara2_oscuro.png'),
      require('../assets/images/avatar/cara3_oscuro.png'),
    ],
  ];

  const camisetas = [
    [
      require('../assets/images/avatar/camiseta1_claro.png'),
      require('../assets/images/avatar/camiseta2_claro.png'),
    ],
    [
      require('../assets/images/avatar/camiseta1_oscuro.png'),
      require('../assets/images/avatar/camiseta2_oscuro.png'),
    ],
  ];

  const peloCortoOptions = [
    require('../assets/images/avatar/pelo1.png'),
    require('../assets/images/avatar/pelo3.png'),
  ];

  const peloLargoOptions = [
    require('../assets/images/avatar/pelo5.png'),
    require('../assets/images/avatar/pelo6.png'),
  ];

  // Fallback seguro: si el índice está fuera de rango, usar el primero
  const colorPeloSeguro = COLORES_PELO[colorPelo] ?? COLORES_PELO[0];

  return (
    <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 36, height: 36 }}>

        <Image
          source={camisetas[si]?.[shirt] ?? camisetas[0][0]}
          style={{
            position: 'absolute',
            top: avatarConfig.shirt.top,
            left: avatarConfig.shirt.left,
            transform: [{ scale: avatarConfig.shirt.scale }],
            zIndex: avatarConfig.shirt.zIndex,
          }}
          resizeMode="contain"
        />

        <Image
          source={caras[si]?.[cara] ?? caras[0][0]}
          style={{
            position: 'absolute',
            top: avatarConfig.cara.top,
            left: avatarConfig.cara.left,
            transform: [{ scale: avatarConfig.cara.scale }],
            zIndex: avatarConfig.cara.zIndex,
          }}
          resizeMode="contain"
        />

        {peloCorto >= 0 && peloCortoOptions[peloCorto] && (
          <Image
            source={peloCortoOptions[peloCorto]}
            style={{
              position: 'absolute',
              top: avatarConfig.peloCorto.top,
              left: avatarConfig.peloCorto.left,
              transform: [{ scale: avatarConfig.peloCorto.scale }],
              zIndex: avatarConfig.peloCorto.zIndex,
              tintColor: colorPeloSeguro,
            }}
            resizeMode="contain"
          />
        )}

        {peloCorto < 0 && peloLargo >= 0 && peloLargoOptions[peloLargo] && (
          <Image
            source={peloLargoOptions[peloLargo]}
            style={{
              position: 'absolute',
              top: avatarConfig.peloLargo.top,
              left: avatarConfig.peloLargo.left,
              transform: [{ scale: avatarConfig.peloLargo.scale }],
              zIndex: avatarConfig.peloLargo.zIndex,
              tintColor: colorPeloSeguro,
            }}
            resizeMode="contain"
          />
        )}

      </View>
    </View>
  );
}