import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Dimensions, StatusBar, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import VideoCard from '../components/VideoCard';

const { height } = Dimensions.get('window');

export default function LumesFeed() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    fetchLumes();
  }, []);

  const fetchLumes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username, full_name, avatar_url)')
        .eq('post_type', 'video')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map(item => ({
          ...item,
          author_username: item.profiles?.username || 'usuario',
          author_name: item.profiles?.full_name || 'Usuário',
          author_avatar: item.profiles?.avatar_url,
        }));
        setReels(mapped);
      }
    } catch (err) {
      console.error('Error fetching lumes:', err);
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00E676" />
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum Lume encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <FlatList
        data={reels}
        pagingEnabled
        vertical
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <VideoCard
            videoUrl={item.media_url}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(prev => !prev)}
            item={item}
          />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
