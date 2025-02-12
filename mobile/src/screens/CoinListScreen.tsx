import React, { useEffect, useState } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  TextInput,
  RefreshControl 
} from 'react-native';
import { CoinListItem } from '../components/CoinListItem';
import { useCoinData } from '../hooks/useCoinData';
import { SearchBar } from '../components/SearchBar';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const CoinListScreen = ({ navigation }) => {
  const { coins, loading, error, refreshCoins } = useCoinData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCoins, setFilteredCoins] = useState([]);

  useEffect(() => {
    if (coins) {
      setFilteredCoins(
        coins.filter(coin => 
          coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, coins]);

  const handleCoinPress = (coin) => {
    navigation.navigate('CoinDetail', { 
      coinId: coin.id,
      symbol: coin.symbol 
    });
  };

  return (
    <View style={styles.container}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search coins..."
      />
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredCoins}
          renderItem={({ item, index }) => (
            <CoinListItem
              coin={item}
              onPress={() => handleCoinPress(item)}
              highlighted={index < 10} // Highlight top 10 traded coins
            />
          )}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshCoins}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 