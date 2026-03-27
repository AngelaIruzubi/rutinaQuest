import { Image, View } from 'react-native';
import { useAvatar } from '../context/AvatarContext';

const COLORES_OJOS = ['#4A90E2', '#2ECC71', '#8E44AD', '#765002'];
const COLORES_PELO = ['#1a1a1a', '#8B4513', '#DAA520', '#E8E8E8'];

export default function AvatarMini() {
  const { avatar } = useAvatar();
  const { tonoPiel, cara, ojos, colorPelo, peloCorto, peloLargo, shirt } = avatar;

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

  return (
    <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 36, height: 36 }}>

        <Image
          source={camisetas[tonoPiel][shirt]}
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
          source={caras[tonoPiel][cara]}
          style={{
            position: 'absolute',
            top: avatarConfig.cara.top,
            left: avatarConfig.cara.left,
            transform: [{ scale: avatarConfig.cara.scale }],
            zIndex: avatarConfig.cara.zIndex,
          }}
          resizeMode="contain"
        />

        {peloCorto >= 0 && (
          <Image
            source={peloCortoOptions[peloCorto]}
            style={{
              position: 'absolute',
              top: avatarConfig.peloCorto.top,
              left: avatarConfig.peloCorto.left,
              transform: [{ scale: avatarConfig.peloCorto.scale }],
              zIndex: avatarConfig.peloCorto.zIndex,
              tintColor: COLORES_PELO[colorPelo],
            }}
            resizeMode="contain"
          />
        )}

        {peloCorto < 0 && peloLargo >= 0 && (
          <Image
            source={peloLargoOptions[peloLargo]}
            style={{
              position: 'absolute',
              top: avatarConfig.peloLargo.top,
              left: avatarConfig.peloLargo.left,
              transform: [{ scale: avatarConfig.peloLargo.scale }],
              zIndex: avatarConfig.peloLargo.zIndex,
              tintColor: COLORES_PELO[colorPelo],
            }}
            resizeMode="contain"
          />
        )}

        

      </View>
    </View>
  );
}