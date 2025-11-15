import * as ImagePicker from 'expo-image-picker';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';

type Props = {
  imageUri?: string;
  onImageSelected: (uri: string) => void;
};

export default function ReceiptImagePicker({ imageUri, onImageSelected }: Props) {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Precisamos de permissão para acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    const uri = result?.assets?.[0]?.uri;
    if (!result.canceled && uri) {
      onImageSelected(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Precisamos de permissão para usar a câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    const uri = result?.assets?.[0]?.uri;
    if (!result.canceled && uri) {
      onImageSelected(uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.85} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Adicionar Comprovante</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
          <Text style={styles.actionText}>📷 Tirar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
          <Text style={styles.actionText}>🖼️ Galeria</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  placeholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#EEE',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#333',
    fontWeight: '600',
  },
});