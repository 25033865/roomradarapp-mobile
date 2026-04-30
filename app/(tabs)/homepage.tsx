import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Dimensions,
	FlatList,
	Image,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useAuth } from "../../authprovider";
import { FavoritePlace, useFavorites } from "../../favoritesProvider";
import { useAdaptiveFrameInterval } from "../../hooks/use-adaptive-frame-interval";

const { width } = Dimensions.get("window");

const CATEGORIES = ["Most Viewed", "Nearby", "Latest"];

const PLACES = [
	{
		id: "1",
		name: "Royal Palm",
		location: "Maniini, Thohoyandou",
		rating: "4.2",
		image:
			"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=600&q=80",
	},
	{
		id: "2",
		name: "Santorini",
		location: "Greece",
		rating: "4.9",
		image:
			"https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80",
	},
	{
		id: "3",
		name: "Amalfi Coast",
		location: "Italy",
		rating: "4.7",
		image:
			"https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=600&q=80",
	},
	{
		id: "4",
		name: "Bali Temples",
		location: "Bali, Indonesia",
		rating: "4.6",
		image:
			"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80",
	},
];

const AVATAR_URL =
	"https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80";

type Place = FavoritePlace;

export default function HomeScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const { isFavorite, toggleFavorite } = useFavorites();
	const [activeCategory, setActiveCategory] = useState("Most Viewed");
	const [searchQuery, setSearchQuery] = useState("");
	const frameIntervalMs = useAdaptiveFrameInterval();
	const maxBatchRender = frameIntervalMs <= 8 ? 8 : 6;
	const displayName = useMemo(() => {
		const profileName = user?.displayName?.trim();
		if (profileName) {
			return profileName;
		}

		const emailName = user?.email?.split("@")[0]?.trim();
		return emailName || "Guest";
	}, [user?.displayName, user?.email]);

	useEffect(() => {
		PLACES.forEach((place) => {
			Image.prefetch(place.image);
		});
		Image.prefetch(AVATAR_URL);
	}, []);

	const handleBottomNavPress = useCallback((key: string) => {
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

		if (key === "home") {
			router.replace("/homepage");
		}
	}, [router]);

	const filteredPlaces = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		if (!normalizedQuery) {
			return PLACES;
		}

		return PLACES.filter((place) => {
			const nameMatch = place.name.toLowerCase().includes(normalizedQuery);
			const locationMatch = place.location.toLowerCase().includes(normalizedQuery);
			return nameMatch || locationMatch;
		});
	}, [searchQuery]);

	const renderPlaceCard = useCallback(({ item }: { item: Place }) => {
		const isFav = isFavorite(item.id);
		return (
			<TouchableOpacity style={styles.card} activeOpacity={0.92}>
				<View style={styles.cardImageWrap}>
					<Image source={{ uri: item.image }} style={styles.cardImage} />

					<TouchableOpacity
						style={styles.favoriteBtn}
						onPress={() => toggleFavorite(item)}
						activeOpacity={0.8}
					>
						<Ionicons
							name={isFav ? "heart" : "heart-outline"}
							size={18}
							color={isFav ? "#FF4E6A" : "#fff"}
						/>
					</TouchableOpacity>
				</View>

				<View style={styles.cardInfo}>
					<Text style={styles.cardName} numberOfLines={2}>
						{item.name}
					</Text>
					<View style={styles.cardLocationRow}>
						<Ionicons name="location-sharp" size={14} color="#9EA7C0" />
						<Text style={styles.cardLocation} numberOfLines={2}>
							{item.location}
						</Text>
					</View>
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={13} color="#FFD700" />
						<Text style={styles.ratingText}>{item.rating}</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}, [isFavorite, toggleFavorite]);

	const keyExtractor = useCallback((item: Place) => item.id, []);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#05071A" />

			<FlatList
				style={styles.scrollView}
				data={filteredPlaces}
				renderItem={renderPlaceCard}
				keyExtractor={keyExtractor}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				decelerationRate="normal"
				scrollEventThrottle={frameIntervalMs}
				bounces={false}
				overScrollMode="never"
				removeClippedSubviews
				initialNumToRender={4}
				maxToRenderPerBatch={maxBatchRender}
				windowSize={7}
				updateCellsBatchingPeriod={frameIntervalMs}
				keyboardShouldPersistTaps="handled"
				ListEmptyComponent={
					searchQuery.trim() ? (
						<View style={styles.emptyResults}>
							<Ionicons name="search-outline" size={46} color="#9aa0ad" />
							<Text style={styles.emptyResultsTitle}>No results found</Text>
							<Text style={styles.emptyResultsText}>
								Try a different place name or location.
							</Text>
						</View>
					) : null
				}
				ListHeaderComponent={
					<>
						{/* ── Top Greeting ── */}
						<View style={styles.header}>
							<View>
								<Text style={styles.greeting}>Hi, {displayName} 👋</Text>
								<Text style={styles.subtitle}>Find a Stay, fast!</Text>
							</View>
							<TouchableOpacity
								onPress={() => handleBottomNavPress("profile")}
								activeOpacity={0.85}
							>
								<Image source={{ uri: AVATAR_URL }} style={styles.avatar} />
								<View style={styles.avatarBadge} />
							</TouchableOpacity>
						</View>

						{/* ── Search Bar ── */}
						<View style={styles.searchContainer}>
							<Feather
								name="search"
								size={18}
								color="#6b6e76"
								style={styles.searchIcon}
							/>
							<TextInput
								style={styles.searchInput}
								placeholder="Search places"
								placeholderTextColor="#bbb"
								value={searchQuery}
								onChangeText={setSearchQuery}
								autoCapitalize="none"
							/>
							<TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
								<MaterialIcons name="tune" size={20} color="#fff" />
							</TouchableOpacity>
						</View>

						{/* ── Popular Places Header ── */}
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Popular places</Text>
							<TouchableOpacity activeOpacity={0.7}>
								<Text style={styles.viewAll}>View all</Text>
							</TouchableOpacity>
						</View>

						{/* ── Category Tabs ── */}
						<View style={styles.tabsRow}>
							{CATEGORIES.map((cat) => {
								const isActive = activeCategory === cat;
								return (
									<TouchableOpacity
										key={cat}
										style={[styles.tab, isActive && styles.tabActive]}
										onPress={() => setActiveCategory(cat)}
										activeOpacity={0.8}
									>
										<Text style={[styles.tabText, isActive && styles.tabTextActive]}>
											{cat}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</>
				}
			/>

			{/* ── Bottom Navigation Bar ── */}
			<View style={styles.bottomNav}>
				<BlurView
					intensity={80}
					tint="light"
					style={StyleSheet.absoluteFillObject}
					pointerEvents="none"
				/>
				{[
					{ key: "home", icon: "home" as const, label: "Home" },
					{ key: "history", icon: "time-outline" as const, label: "History" },
					{ key: "favorites", icon: "heart-outline" as const, label: "Saved" },
					{ key: "profile", icon: "person-outline" as const, label: "Profile" },
				].map((item) => {
					const isActive = item.key === "home";
					return (
						<TouchableOpacity
							key={item.key}
							style={styles.navItem}
							onPress={() => handleBottomNavPress(item.key)}
							activeOpacity={0.7}
						>
							<Ionicons
								name={isActive && item.key === "home" ? "home" : item.icon}
								size={24}
								color={isActive ? "#1a1a2e" : "#05071A"}
							/>
							{isActive && <View style={styles.navDot} />}
						</TouchableOpacity>
					);
				})}
			</View>
		</SafeAreaView>
	);
}

const CARD_WIDTH = width - 48;
const CARD_IMAGE_WIDTH = Math.min(width * 0.34, 142);
const CARD_HEIGHT = Math.max(CARD_IMAGE_WIDTH * 1.95, 255);

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#05071A",
	},
	scrollView: {
		flex: 4,
	},
	scrollContent: {
		paddingBottom: 200,
	},

	/* ── Header ── */
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 4,
	},
	greeting: {
		fontSize: 26,
		fontWeight: "800",
		color: "#fafafe",
		letterSpacing: -0.5,
	},
	subtitle: {
		fontSize: 20,
		color: "#b9b9be",
		marginTop: 3,
		fontWeight: "500",
	},
	avatar: {
		width: 46,
		height: 46,
		borderRadius: 23,
		borderWidth: 2,
		borderColor: "#fff",
	},
	avatarBadge: {
		position: "absolute",
		bottom: 1,
		right: 1,
		width: 11,
		height: 11,
		borderRadius: 6,
		backgroundColor: "#4ADE80",
		borderWidth: 2,
		borderColor: "#05071A",
	},

	/* ── Search ── */
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 18,
		marginHorizontal: 24,
		marginTop: 22,
		marginBottom: 6,
		paddingLeft: 14,
		paddingRight: 6,
		paddingVertical: 6,
		shadowColor: "#080505",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 3,
		borderWidth: 1,
		borderColor: "#f0f0f4",
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: "#333",
		paddingVertical: 8,
		fontWeight: "400",
	},
	filterBtn: {
		backgroundColor: "#1a1a2e",
		borderRadius: 12,
		padding: 9,
		marginLeft: 6,
	},

	/* ── Section Header ── */
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 24,
		marginTop: 28,
		marginBottom: 14,
	},
	sectionTitle: {
		fontSize: 19,
		fontWeight: "800",
		color: "#efefff",
		letterSpacing: -0.3,
	},
	viewAll: {
		fontSize: 13,
		color: "#aeaeb3",
		fontWeight: "600",
	},

	/* ── Tabs ── */
	tabsRow: {
		flexDirection: "row",
		paddingHorizontal: 24,
		marginBottom: 20,
		gap: 8,
	},
	tab: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#ededf5",
	},
	tabActive: {
		backgroundColor: "#1a1a2e",
	},
	tabText: {
		fontSize: 13,
		color: "#9a9aaa",
		fontWeight: "600",
	},
	tabTextActive: {
		color: "#fff",
	},

	/* ── Cards ── */
	card: {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		alignSelf: "center",
		flexDirection: "row",
		borderRadius: 18,
		overflow: "hidden",
		marginBottom: 30,
		backgroundColor: "#101427",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 16,
		elevation: 2,
	},
	cardImageWrap: {
		width: CARD_IMAGE_WIDTH,
		height: CARD_HEIGHT,
		backgroundColor: "#11182f",
	},
	cardImage: {
		width: "100%",
		height: "100%",
		resizeMode: "cover",
	},
	favoriteBtn: {
		position: "absolute",
		top: 12,
		right: 12,
		backgroundColor: "rgba(0,0,0,0.28)",
		borderRadius: 20,
		padding: 7,
	},
	cardInfo: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	cardName: {
		fontSize: 18,
		fontWeight: "800",
		color: "#fff",
		letterSpacing: -0.2,
		marginBottom: 10,
	},
	cardLocationRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 5,
		marginBottom: 14,
	},
	cardLocation: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: "#c2c8d8",
	},
	emptyResults: {
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
		paddingTop: 38,
		paddingBottom: 24,
	},
	emptyResultsTitle: {
		fontSize: 19,
		fontWeight: "800",
		color: "#f4f5ff",
		marginTop: 12,
	},
	emptyResultsText: {
		fontSize: 14,
		color: "#a9abc3",
		textAlign: "center",
		marginTop: 6,
		lineHeight: 20,
	},
	ratingRow: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 3,
	},
	ratingText: {
		fontSize: 12,
		color: "#fff",
		fontWeight: "700",
		marginLeft: 2,
	},

	/* ── Bottom Nav ── */
	bottomNav: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.18)",
		paddingVertical: 10,
		paddingHorizontal: 10,
		borderRadius: 36,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.18)",
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.14,
		shadowRadius: 18,
		elevation: 18,
		overflow: "hidden",
		position: "absolute",
		bottom: 16,
		left: 16,
		right: 16,
	},
	navItem: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
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
