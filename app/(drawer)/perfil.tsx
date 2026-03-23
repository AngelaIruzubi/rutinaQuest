import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAvatar } from '../../context/AvatarContext';

export default function Perfil() {

  const avatarConfig = {
    cara: { top: -100, left: 0, zIndex: 1, scale: 1 },
    ojos: { top: -37, left: 40, width: 130, zIndex: 3 },
    peloCorto: { top: -145, left: 10, scale: 1.05, zIndex: 2 },
    peloLargo: { top: -150, left: 3, scale: 1.05, zIndex: 2 },
    shirt: { top: 75, left: -45, scale: 1, zIndex: 5 },
  };

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { avatar, updateAvatar } = useAvatar();
  const { cara, ojos, peloCorto, peloLargo, shirt } = avatar;

  const caras = [
    require('../../assets/images/avatar/cara1_claro.png'),
    require('../../assets/images/avatar/cara2_claro.png'),
    require('../../assets/images/avatar/cara3_claro.png'),
  ];

  const eyesImages = [
    require('../../assets/images/avatar/ojos1.png'),
    require('../../assets/images/avatar/ojos2.png'),
    require('../../assets/images/avatar/ojos3.png'),
    require('../../assets/images/avatar/ojos4.png'),
  ];

  const peloCortoOptions = [
    require('../../assets/images/avatar/pelo1.png'),
    require('../../assets/images/avatar/pelo3.png'),
  ];

  const peloLargoOptions = [
    require('../../assets/images/avatar/pelo4.png'),
    require('../../assets/images/avatar/pelo5.png'),
    require('../../assets/images/avatar/pelo6.png'),
  ];

  const shirtOptions = [
    require('../../assets/images/avatar/camiseta1_claro.png'),
    require('../../assets/images/avatar/camiseta2_claro.png'),
  ];

  const eyeColors = ['#2ECC71', '#4A90E2', '#8E44AD', '#765002'];

  const OptionSelector = ({ title, options, selected, field }: any) => (
    <View style={{
      marginBottom: 30,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    }}>

      <Text style={{
        fontSize: 18,
        marginBottom: 10,
        color: '#A77BBE',
        fontWeight: '800',
      }}>
        {title}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((img: any, index: number) => (

          <Pressable
            key={index}
            onPress={() => {

              if (field === 'peloCorto') {
                updateAvatar('peloCorto', index);
                updateAvatar('peloLargo', -1);
              }

              else if (field === 'peloLargo') {
                updateAvatar('peloLargo', index);
                updateAvatar('peloCorto', -1);
              }

              else {
                updateAvatar(field, index);
              }

            }}
            style={{
              marginRight: 15,
              borderWidth: selected === index ? 4 : 1,
              borderColor: selected === index ? '#A77BBE' : '#DDD',
              borderRadius: 12,
              padding: 6,
            }}
          >

            <Image
              source={img}
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />

          </Pressable>

        ))}
      </ScrollView>

    </View>
  );

  const EyeColorSelector = () => (
    <View style={{ marginBottom: 30, width: '100%', alignItems: 'center' }}>

      <Text style={{
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
        color: '#A77BBE',
        fontWeight: '800',
      }}>
        Ojos
      </Text>

      <View style={{
        flexDirection: 'row',

      }}>

        {eyeColors.map((color, index) => (

          <Pressable
            key={index}
            onPress={() => updateAvatar('ojos', index)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: color,
              marginRight: 15,
              borderWidth: ojos === index ? 3 : 1,
              borderColor: ojos === index ? '#A77BBE' : '#DDD',
            }}
          />

        ))}

      </View>
    </View>
  );

  return (

    <ScrollView contentContainerStyle={{
      padding: 20,
      backgroundColor: '#fff',
      alignItems: 'center',
    }}>

      <Text style={{
        fontSize: 32,
        marginBottom: 20,
        color: '#A77BBE',
        fontWeight: 'bold',
        textAlign: 'center',
      }}>
        Personaliza tu Avatar
      </Text>

      <View style={{
        flexDirection: isTablet ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
 
      }}>

        {/* AVATAR */}

        <View style={{
          width: isTablet ? 260 : 180,
          height: isTablet ? 260 : 180,
          marginBottom: isTablet ? 0 : 80,
          marginTop: isTablet ? 0 : 90,
          marginLeft: isTablet ? 0 : 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}>

          <View style={{
            width: 260,
            height: 260,
            transform: [{ scale: isTablet ? 1 : 0.7 }],
          }}>

            {/* CAMISETA */}

            <Image
              source={shirtOptions[shirt]}
              style={{
                position: 'absolute',
                top: avatarConfig.shirt.top,
                left: avatarConfig.shirt.left,
                transform: [{ scale: avatarConfig.shirt.scale }],
                zIndex: avatarConfig.shirt.zIndex,
              }}
              resizeMode="contain"
            />

            {/* CARA */}

            <Image
              source={caras[cara]}
              style={{
                position: 'absolute',
                top: avatarConfig.cara.top,
                left: avatarConfig.cara.left,
                transform: [{ scale: avatarConfig.cara.scale }],
                zIndex: avatarConfig.cara.zIndex,
              }}
              resizeMode="contain"
            />

            {/* PELO (solo uno visible) */}

            {peloCorto >= 0 && (
            <Image
              source={peloCortoOptions[peloCorto]}
              style={{
                position: 'absolute',
                top: avatarConfig.peloCorto.top,
                left: avatarConfig.peloCorto.left,
                transform: [{ scale: avatarConfig.peloCorto.scale }],
                zIndex: avatarConfig.peloCorto.zIndex,
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
              }}
              resizeMode="contain"
            />
          )}

            {/* OJOS */}

            <Image
              source={eyesImages[ojos]}
              style={{
                position: 'absolute',
                top: avatarConfig.ojos.top,
                left: avatarConfig.ojos.left,
                width: avatarConfig.ojos.width,
                zIndex: avatarConfig.ojos.zIndex,
              }}
              resizeMode="contain"
            />

          </View>

        </View>

        {/* SELECTORES */}

        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>

          <OptionSelector title="Cara" options={caras} selected={cara} field="cara" />

          <EyeColorSelector />

          <OptionSelector title="Pelo Corto" options={peloCortoOptions} selected={peloCorto} field="peloCorto" />

          <OptionSelector title="Pelo Largo" options={peloLargoOptions} selected={peloLargo} field="peloLargo" />

          <OptionSelector title="Camiseta" options={shirtOptions} selected={shirt} field="shirt" />

        </View>

      </View>

    </ScrollView>
  );
}