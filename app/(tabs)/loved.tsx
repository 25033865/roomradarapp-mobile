import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
    FlatList,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { FavoritePlace, useFavorites } from "../../favoritesProvider";
import { useAdaptiveFrameInterval } from "../../hooks/use-adaptive-frame-interval";

const LOVED_CARD_HEIGHT = 260;
const LOVED_CARD_GAP = 20;
const LOVED_ITEM_SIZE = LOVED_CARD_HEIGHT + LOVED_CARD_GAP;

export default function LovedScreen() {
	const router = useRouter();
	const { favorites, toggleFavorite } = useFavorites();
	const frameIntervalMs = useAdaptiveFrameInterval();
	const maxBatchRender = frameIntervalMs <= 8 ? 6 : 5;

	useEffect(() => {
		favorites.forEach((item) => {
			Image.prefetch(item.image);
		});
	}, [favorites]);

	const handleBottomNavPress = useCallback((key: string) => {
		if (key === "home") {
			router.replace("/homepage");
			return;
		}

		if (key === "history") {
			router.replace("/history");
			return;
		}

		if (key === "favorites") {
			router.replace("/loved");
			return;
		}

		if (key === "profile") {
			router.replace("/profile");
			return;
		}
	}, [router]);

	const renderLovedPlace = useCallback(({ item }: { item: FavoritePlace }) => (
		<View style={styles.card}>
			<Image source={{ uri: item.image }} style={styles.cardImage} />
			<TouchableOpacity
				style={styles.favoriteBtn}
				onPress={() => toggleFavorite(item)}
				activeOpacity={0.8}
			>
				<Ionicons name="heart" size={18} color="#FF4E6A" />
			</TouchableOpacity>

			<View style={styles.cardOverlay}>
				<Text style={styles.cardName}>{item.name}</Text>
				<View style={styles.cardMeta}>
					<View style={styles.locationRow}>
						<Ionicons name="location-sharp" size={12} color="#e0e0e0" />
						<Text style={styles.locationText}>{item.location}</Text>
					</View>
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={12} color="#FFD700" />
						<Text style={styles.ratingText}>{item.rating}</Text>
					</View>
				</View>
			</View>
		</View>
	), [toggleFavorite]);

	const keyExtractor = useCallback((item: FavoritePlace) => item.id, []);

	const getItemLayout = useCallback((_: ArrayLike<FavoritePlace> | null | undefined, index: number) => ({
		length: LOVED_ITEM_SIZE,
		offset: LOVED_ITEM_SIZE * index,
		index,
	}), []);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor="#05071A" />

			<View style={styles.header}>
				<Text style={styles.title}>Favourites</Text>
				<Text style={styles.subtitle}>{favorites.length} saved</Text>
			</View>

			{favorites.length > 0 ? (
				<FlatList
					data={favorites}
					renderItem={renderLovedPlace}
					keyExtractor={keyExtractor}
					getItemLayout={getItemLayout}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
					decelerationRate="normal"
					scrollEventThrottle={frameIntervalMs}
					bounces={false}
					overScrollMode="never"
					removeClippedSubviews
					initialNumToRender={3}
					maxToRenderPerBatch={maxBatchRender}
					windowSize={7}
					updateCellsBatchingPeriod={frameIntervalMs}
					keyboardShouldPersistTaps="handled"
				/>
			) : (
				<View style={styles.emptyState}>
					<Ionicons name="heart-outline" size={52} color="#8f91aa" />
					<Text style={styles.emptyTitle}>No loved places yet</Text>
					<Text style={styles.emptySubtitle}>
						Press the heart on a place and it will show here.
					</Text>
					<TouchableOpacity
						style={styles.exploreButton}
						onPress={() => router.replace("/homepage")}
						activeOpacity={0.85}
					>
						<Text style={styles.exploreButtonText}>Explore places</Text>
					</TouchableOpacity>
				</View>
			)}

			<View style={styles.bottomNav}>
				{[
					{ key: "home", icon: "home-outline" as const },
					{ key: "history", icon: "time-outline" as const },
					{ key: "favorites", icon: "heart-outline" as const },
					{ key: "profile", icon: "person-outline" as const },
				].map((item) => {
					const isActive = item.key === "favorites";
					return (
						<TouchableOpacity
							key={item.key}
							style={styles.navItem}
							onPress={() => handleBottomNavPress(item.key)}
							activeOpacity={0.7}
						>
							<Ionicons
								name={
									isActive && item.key === "favorites" ? "heart" : item.icon
								}
								size={24}
								color={isActive ? "#1a1a2e" : "#c0c0c0"}
							/>
							{isActive && <View style={styles.navDot} />}
						</TouchableOpacity>
					);
				})}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#05071A",
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 12,
	},
	title: {
		fontSize: 28,
		fontWeight: "800",
		color: "#fafafe",
		letterSpacing: -0.5,
	},
	subtitle: {
		fontSize: 14,
		color: "#b9b9be",
		marginTop: 4,
		fontWeight: "500",
	},
	listContent: {
		paddingHorizontal: 24,
		paddingBottom: 120,
	},
	card: {
		height: LOVED_CARD_HEIGHT,
		borderRadius: 24,
		overflow: "hidden",
		marginBottom: LOVED_CARD_GAP,
		backgroundColor: "#ddd",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 16,
		elevation: 8,
	},
	cardImage: {
		width: "100%",
		height: "100%",
		resizeMode: "cover",
	},
	favoriteBtn: {
		position: "absolute",
		top: 14,
		right: 14,
		backgroundColor: "rgba(0,0,0,0.28)",
		borderRadius: 20,
		padding: 7,
	},
	cardOverlay: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingVertical: 14,
		backgroundColor: "rgba(10,10,30,0.52)",
	},
	cardName: {
		fontSize: 16,
		fontWeight: "800",
		color: "#fff",
		letterSpacing: -0.2,
		marginBottom: 5,
	},
	cardMeta: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	locationRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	locationText: {
		fontSize: 12,
		color: "#ddd",
		marginLeft: 2,
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.15)",
		borderRadius: 10,
		paddingHorizontal: 7,
		paddingVertical: 3,
	},
	ratingText: {
		fontSize: 12,
		color: "#fff",
		fontWeight: "700",
		marginLeft: 2,
	},
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 30,
		paddingBottom: 100,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#f1f1ff",
		marginTop: 14,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#a9abc3",
		textAlign: "center",
		marginTop: 8,
		lineHeight: 22,
	},
	exploreButton: {
		marginTop: 18,
		backgroundColor: "#fff",
		paddingHorizontal: 18,
		paddingVertical: 11,
		borderRadius: 12,
	},
	exploreButtonText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#05071A",
	},
	bottomNav: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.98)",
		paddingVertical: 10,
		paddingHorizontal: 10,
		borderRadius: 28,
		borderWidth: 1,
		borderColor: "#ececf3",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.14,
		shadowRadius: 18,
		elevation: 18,
		position: "absolute",
		bottom: 16,
		left: 16,
		right: 16,
	},
	navItem: {
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 16,
		paddingVertical: 4,
		gap: 4,
	},
	navDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: "#FF4E6A",
		marginTop: 2,
	},
});
