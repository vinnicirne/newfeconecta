import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text, Image, Animated } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Play, Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface VideoCardProps {
  videoUrl: string;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  item: any;
}

export default function VideoCard({ videoUrl, isActive, isMuted, onToggleMute, item }: VideoCardProps) {
  const video = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const playIconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      video.current?.playAsync();
      setIsPlaying(true);
    } else {
      video.current?.pauseAsync();
      video.current?.setPositionAsync(0);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (isPlaying) {
      video.current?.pauseAsync();
      setIsPlaying(false);
      showPlayIcon();
    } else {
      video.current?.playAsync();
      setIsPlaying(true);
      hidePlayIcon();
    }
  };

  const showPlayIcon = () => {
    Animated.timing(playIconOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hidePlayIcon = () => {
    Animated.timing(playIconOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={togglePlay} style={styles.videoPressable}>
        <Video
          ref={video}
          style={styles.video}
          source={{ uri: videoUrl }}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={isMuted}
          shouldPlay={isActive}
          useNativeControls={false}
        />

        {/* Play Icon Indicator */}
        {!isPlaying && (
          <Animated.View style={[styles.playIndicator, { opacity: playIconOpacity }]}>
            <View style={styles.playIconContainer}>
              <Play size={40} color="white" fill="white" style={{ marginLeft: 5 }} />
            </View>
          </Animated.View>
        )}

        {/* Gradient Overlays (Simulated with views for blank-typescript template) */}
        <View style={styles.bottomOverlay} />
      </Pressable>

      {/* Info & Side Bar */}
      <View style={styles.uiContainer}>
        {/* Author Info */}
        <View style={styles.infoContainer}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
               {item.author_avatar ? (
                 <Image source={{ uri: item.author_avatar }} style={styles.avatarImg} />
               ) : (
                 <Text style={styles.avatarText}>{(item.author_name || 'U')[0]}</Text>
               )}
            </View>
            <Text style={styles.username}>@{item.author_username || 'usuario'}</Text>
          </View>
          <Text style={styles.caption} numberOfLines={2}>{item.content}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <Pressable style={styles.actionButton}>
            <View style={styles.iconCircle}>
              <Heart size={28} color="white" />
            </View>
            <Text style={styles.actionText}>{item.likes?.length || 0}</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <View style={styles.iconCircle}>
              <MessageCircle size={28} color="white" />
            </View>
            <Text style={styles.actionText}>{item.comments_count || 0}</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <View style={styles.iconCircle}>
              <Share2 size={28} color="white" />
            </View>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={onToggleMute}>
            <View style={styles.iconCircle}>
              {isMuted ? <VolumeX size={28} color="white" /> : <Volume2 size={28} color="#00E676" />}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: 'black',
  },
  videoPressable: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  playIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'rgba(0,0,0,0.4)', // Simplified gradient substitute
  },
  uiContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
  },
  infoContainer: {
    flex: 1,
    paddingRight: 20,
    marginBottom: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 18,
  },
  username: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionBar: {
    width: 60,
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
