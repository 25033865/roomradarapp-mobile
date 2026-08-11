import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Image,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

type Param = string | string[] | undefined;

const APP_BACKGROUND = "#05071A";
const PANEL = "#101427";
const PANEL_ALT = "#0B1022";
const PRIMARY_TEXT = "#FAFAFE";
const SECONDARY_TEXT = "#B9B9BE";
const MUTED_TEXT = "#8F95AA";
const BORDER = "rgba(255,255,255,0.10)";
const ACCENT = "#EAF2FF";

const PLACEHOLDER_HOTEL_IMAGES = [
	"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
	"https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
	"https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80",
	"https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80",
	"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
	"https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80",
	"https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
	"https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80",
	"https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80",
	"https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&q=80",
];

function getParam(value: Param, fallback = ""): string {
	if (Array.isArray(value)) {
		return value[0] ?? fallback;
	}
	return value ?? fallback;
}

function parseHotelImages(imagesParam: string, fallbackImage: string): string[] {
	let parsedImages: string[] = [];

	if (imagesParam) {
		try {
			const parsed = JSON.parse(imagesParam) as unknown;
			if (Array.isArray(parsed)) {
				parsedImages = parsed.filter((item): item is string => typeof item === "string");
			}
		} catch {
			parsedImages = imagesParam.split(",");
		}
	}

	const images = [fallbackImage, ...parsedImages]
		.map((item) => item.trim())
		.filter(Boolean);
	const uniqueImages = Array.from(new Set(images));

	return uniqueImages.length > 0 ? uniqueImages : PLACEHOLDER_HOTEL_IMAGES;
}

export default function PlaceDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const { width, height } = useWindowDimensions();
	const viewerOpacity = useRef(new Animated.Value(0)).current;
	const viewerScale = useRef(new Animated.Value(0.94)).current;
	const viewerListRef = useRef<FlatList<string>>(null);
	const [isViewerVisible, setIsViewerVisible] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);

	const name = getParam(params.name, "Place");
	const location = getParam(params.location, "Location unavailable");
	const rating = getParam(params.rating, "N/A");
	const image = getParam(params.image);
	const imagesParam = getParam(params.images);
	const hotelImages = useMemo(
		() => parseHotelImages(imagesParam, image),
		[image, imagesParam]
	);
	const hotel = useMemo(
		() => ({
			name,
			location,
			rating,
			images: hotelImages,
		}),
		[hotelImages, location, name, rating]
	);

	const collageGap = 4;
	const collageWidth = width - 36;

	// top: two larger images; bottom: three smaller images
	const topPreviewImages = hotel.images.slice(0, Math.min(2, hotel.images.length));
	const bottomPreviewImages = hotel.images.slice(2, Math.min(5, hotel.images.length));
	const remainingPhotoCount = Math.max(hotel.images.length - 5, 0);
	const topTileWidth =
		topPreviewImages.length === 1 ? collageWidth : (collageWidth - collageGap) / 2;
	const bottomTileWidth =
		bottomPreviewImages.length <= 1
			? collageWidth
			: bottomPreviewImages.length === 2
				? (collageWidth - collageGap) / 2
				: (collageWidth - collageGap * 2) / 3;
	const topTileHeight = Math.min(Math.max(topTileWidth * 0.66, 126), 210);
	const bottomTileHeight = Math.min(Math.max(bottomTileWidth * 0.96, 104), 170);

	const openImageViewer = useCallback(
		(index: number) => {
			setSelectedImageIndex(index);
			setIsViewerVisible(true);
			viewerOpacity.setValue(0);
			viewerScale.setValue(0.94);

			requestAnimationFrame(() => {
				viewerListRef.current?.scrollToIndex({
					index,
					animated: false,
				});

				Animated.parallel([
					Animated.timing(viewerOpacity, {
						toValue: 1,
						duration: 220,
						useNativeDriver: true,
					}),
					Animated.spring(viewerScale, {
						toValue: 1,
						damping: 18,
						stiffness: 190,
						mass: 0.85,
						useNativeDriver: true,
					}),
				]).start();
			});
		},
		[viewerOpacity, viewerScale]
	);

	const closeImageViewer = useCallback(() => {
		Animated.parallel([
			Animated.timing(viewerOpacity, {
				toValue: 0,
				duration: 180,
				useNativeDriver: true,
			}),
			Animated.timing(viewerScale, {
				toValue: 0.96,
				duration: 180,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) {
				setIsViewerVisible(false);
			}
		});
	}, [viewerOpacity, viewerScale]);

	const handleViewerScrollEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
			setSelectedImageIndex(nextIndex);
		},
		[width]
	);

	const renderViewerImage = useCallback(
		({ item }: { item: string }) => (
			<View style={[styles.viewerSlide, { width }]}>
				<Animated.Image
					source={{ uri: item }}
					style={[
						styles.viewerImage,
						{
							height: height * 0.78,
							transform: [{ scale: viewerScale }],
						},
					]}
					resizeMode="contain"
				/>
			</View>
		),
		[height, viewerScale, width]
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor={APP_BACKGROUND} />
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				bounces={false}
				overScrollMode="never"
			>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Go back"
				>
					<Ionicons name="chevron-back" size={20} color={PRIMARY_TEXT} />
					<Text style={styles.backText}>Back</Text>
				</TouchableOpacity>

				<View style={styles.photosSection}>
					<View style={styles.hotelHeroHeader}>
						<View style={styles.hotelTitleWrap}>
							<Text style={styles.hotelTitle}>{hotel.name}</Text>
							<View style={styles.hotelClassRow}>
								{[0, 1, 2].map((item) => (
									<View key={item} style={styles.hotelClassIcon}>
										<View style={styles.hotelClassDot} />
									</View>
								))}
							</View>
						</View>
						<View style={styles.scoreBadge}>
							<Text style={styles.scoreText}>{hotel.rating.replace(".", ",")}</Text>
						</View>
					</View>

					<Text style={styles.hotelAddress}>{hotel.location}</Text>

					<View style={styles.collage}>
						<View style={styles.collageRow}>
							{topPreviewImages.map((hotelImage, index) => {
								<TouchableOpacity
									key={`${hotelImage}-${index}`}
									style={[
										styles.collageTile,
										styles.collageTopTile,
										{ 
											width: topTileWidth,
											height: topTileHeight,
											marginRight: topPreviewImages.length > 1 && index === 0 ? collageGap : 0,
										}
									]}
									onPress={() => openImageViewer(index)}
									activeOpacity={0.88}
									accessibilityRole="imagebutton"
									accessibilityLabel={`Open hotel photo ${index + 1}`}
								>
									<Image
										source={{ uri: hotelImage }}
										style={[styles.galleryImage]}
										resizeMode="cover"
									/>
								</TouchableOpacity>
							))}
						</View>

						<View style={[styles.collageRow, { marginTop: collageGap }]}>
							{bottomPreviewImages.map((hotelImage, itemIndex) => {
								const imageIndex = itemIndex + 2;
								const showRemainingOverlay =
									itemIndex === bottomPreviewImages.length - 1 &&
									remainingPhotoCount > 0;

								return (
									<TouchableOpacity
										key={`${hotelImage}-${imageIndex}`}
										style={[
											styles.collageTile,
											{
												width: bottomTileWidth,
												height: bottomTileHeight,
												marginRight: itemIndex < bottomPreviewImages.length - 1 ? collageGap : 0,
											},
										]}
										onPress={() => openImageViewer(imageIndex)}
										activeOpacity={0.88}
										accessibilityRole="imagebutton"
										accessibilityLabel={`Open hotel photo ${imageIndex + 1}`}
									>
										<Image
											source={{ uri: hotelImage }}
											style={styles.galleryImage}
											resizeMode="cover"
										/>
										{showRemainingOverlay ? (
											<View style={styles.remainingOverlay}>
												<Text style={styles.remainingText}>+{remainingPhotoCount}</Text>
											</View>
										) : null}
									</TouchableOpacity>
								);
							})}
						</View>

						{hotel.images.length > 0 ? (
							<TouchableOpacity
								style={styles.viewAllPhotosButton}
								onPress={() => openImageViewer(0)}
								activeOpacity={0.82}
								accessibilityRole="button"
								accessibilityLabel="View all hotel photos"
							>
								<Ionicons name="images-outline" size={15} color={PRIMARY_TEXT} />
								<Text style={styles.viewAllPhotosText}>
									View all {hotel.images.length} photos
								</Text>
							</TouchableOpacity>
						) : null}
					</View>
				</View>

				<View style={styles.infoCard}>
					<Text style={styles.name}>{hotel.name}</Text>
					<View style={styles.row}>
						<Ionicons name="location-sharp" size={16} color="#b0b8d1" />
						<Text style={styles.location}>{hotel.location}</Text>
					</View>
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={14} color="#FFD700" />
						<Text style={styles.rating}>{hotel.rating}</Text>
					</View>

					<Text style={styles.aboutTitle}>About this place</Text>
					<Text style={styles.body}>
						This is your detailed view. You can add more sections here like amenities,
						pricing, photos, contact information, and booking actions.
					</Text>
				</View>
			</ScrollView>

			<Modal
				visible={isViewerVisible}
				transparent
				statusBarTranslucent
				animationType="none"
				onRequestClose={closeImageViewer}
			>
				<Animated.View style={[styles.viewerBackdrop, { opacity: viewerOpacity }]}>
					<SafeAreaView style={styles.viewerSafeArea}>
						<View style={styles.viewerHeader}>
							<View style={styles.viewerCounterBadge}>
								<Text style={styles.viewerCounterText}>
									{selectedImageIndex + 1} / {hotel.images.length}
								</Text>
							</View>
							<TouchableOpacity
								style={styles.viewerCloseButton}
								onPress={closeImageViewer}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Close photo viewer"
							>
								<Ionicons name="close" size={24} color={PRIMARY_TEXT} />
							</TouchableOpacity>
						</View>

						<FlatList
							ref={viewerListRef}
							data={hotel.images}
							renderItem={renderViewerImage}
							keyExtractor={(item, index) => `${item}-${index}`}
							horizontal
							pagingEnabled
							showsHorizontalScrollIndicator={false}
							initialScrollIndex={selectedImageIndex}
							getItemLayout={(_, index) => ({
								length: width,
								offset: width * index,
								index,
							})}
							onMomentumScrollEnd={handleViewerScrollEnd}
							onScrollToIndexFailed={({ index }) => {
								setTimeout(() => {
									viewerListRef.current?.scrollToOffset({
										offset: width * index,
										animated: false,
									});
								}, 0);
							}}
							bounces={false}
							overScrollMode="never"
						/>
					</SafeAreaView>
				</Animated.View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: APP_BACKGROUND,
	},
	content: {
		padding: 18,
		paddingTop: 36,
		paddingBottom: 36,
	},
	backButton: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 10,
		marginBottom: 16,
		borderRadius: 10,
		backgroundColor: "rgba(255,255,255,0.08)",
	},
	backText: {
		color: PRIMARY_TEXT,
		fontSize: 14,
		fontWeight: "600",
		marginLeft: 4,
	},
	photosSection: {
		marginBottom: 18,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		marginBottom: 14,
	},
	sectionTitle: {
		color: PRIMARY_TEXT,
		fontSize: 21,
		fontWeight: "900",
	},
	sectionSubtitle: {
		color: MUTED_TEXT,
		fontSize: 13,
		fontWeight: "600",
		marginTop: 3,
	},
	photoCountBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: PANEL,
		paddingHorizontal: 11,
		paddingVertical: 7,
	},
	photoCountText: {
		color: ACCENT,
		fontSize: 12,
		fontWeight: "900",
	},
	featuredImageButton: {
		borderRadius: 24,
		overflow: "hidden",
		backgroundColor: PANEL_ALT,
		marginBottom: 10,
	},
	featuredImage: {
		width: "100%",
	},
	featuredOverlay: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: "flex-end",
		padding: 14,
		backgroundColor: "rgba(5,7,26,0.18)",
	},
	featuredPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		backgroundColor: "rgba(5,7,26,0.72)",
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	featuredPillText: {
		color: PRIMARY_TEXT,
		fontSize: 12,
		fontWeight: "800",
	},
	galleryGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	galleryItem: {
		aspectRatio: 1.06,
		borderRadius: 18,
		overflow: "hidden",
		backgroundColor: PANEL_ALT,
	},
	galleryImage: {
		width: "100%",
		height: "100%",
	},
	collage: {
		marginTop: 10,
	},
	collageRow: {
		flexDirection: "row",
		alignItems: "stretch",
	},
	collageTile: {
		borderRadius: 18,
		overflow: "hidden",
		backgroundColor: PANEL_ALT,
	},
	collageTopTile: {
		// slightly larger visual treatment for top tiles
	},
	remainingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.44)",
		alignItems: "center",
		justifyContent: "center",
	},
	remainingText: {
		color: PRIMARY_TEXT,
		fontSize: 20,
		fontWeight: "800",
	},
	viewAllPhotosButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 12,
		alignSelf: "flex-start",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 14,
		backgroundColor: "rgba(255,255,255,0.04)",
		borderWidth: 1,
		borderColor: BORDER,
	},
	viewAllPhotosText: {
		color: PRIMARY_TEXT,
		fontSize: 13,
		fontWeight: "800",
		marginLeft: 6,
	},
	hotelHeroHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	hotelTitleWrap: {
		flex: 1,
		marginRight: 12,
	},
	hotelTitle: {
		color: PRIMARY_TEXT,
		fontSize: 18,
		fontWeight: "900",
	},
	hotelClassRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 6,
		gap: 8,
	},
	hotelClassIcon: {
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: "rgba(255,255,255,0.04)",
		alignItems: "center",
		justifyContent: "center",
	},
	hotelClassDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: ACCENT,
	},
	scoreBadge: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.04)",
		borderWidth: 1,
		borderColor: BORDER,
		alignItems: "center",
		justifyContent: "center",
	},
	scoreText: {
		color: PRIMARY_TEXT,
		fontWeight: "800",
		fontSize: 13,
	},
	hotelAddress: {
		color: MUTED_TEXT,
		fontSize: 13,
		marginTop: 6,
		marginBottom: 10,
	},
	infoCard: {
		backgroundColor: PANEL,
		borderRadius: 18,
		padding: 16,
	},
	name: {
		fontSize: 24,
		fontWeight: "800",
		color: PRIMARY_TEXT,
		marginBottom: 12,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	location: {
		fontSize: 15,
		color: "#d5daeb",
		marginLeft: 6,
		flex: 1,
	},
	ratingRow: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.08)",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 12,
		marginBottom: 18,
	},
	rating: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: "700",
		color: PRIMARY_TEXT,
	},
	aboutTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: PRIMARY_TEXT,
		marginBottom: 8,
	},
	body: {
		fontSize: 14,
		lineHeight: 21,
		color: "#c7cee3",
	},
	viewerBackdrop: {
		flex: 1,
		backgroundColor: "rgba(5,7,26,0.98)",
	},
	viewerSafeArea: {
		flex: 1,
	},
	viewerHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 18,
		paddingTop: 18,
		paddingBottom: 10,
	},
	viewerCounterBadge: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: "rgba(255,255,255,0.08)",
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	viewerCounterText: {
		color: PRIMARY_TEXT,
		fontSize: 13,
		fontWeight: "800",
	},
	viewerCloseButton: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 21,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: "rgba(255,255,255,0.08)",
	},
	viewerSlide: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 14,
	},
	viewerImage: {
		width: "100%",
		borderRadius: 18,
	},
});
