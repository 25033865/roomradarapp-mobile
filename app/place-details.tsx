import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Param = string | string[] | undefined;

function getParam(value: Param, fallback = ""): string {
	if (Array.isArray(value)) {
		return value[0] ?? fallback;
	}
	return value ?? fallback;
}

export default function PlaceDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();

	const name = getParam(params.name, "Place");
	const location = getParam(params.location, "Location unavailable");
	const rating = getParam(params.rating, "N/A");
	const image = getParam(params.image);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor="#05071A" />
			<ScrollView contentContainerStyle={styles.content}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					activeOpacity={0.8}
				>
					<Ionicons name="chevron-back" size={20} color="#fff" />
					<Text style={styles.backText}>Back</Text>
				</TouchableOpacity>

				{image ? <Image source={{ uri: image }} style={styles.image} /> : null}

				<View style={styles.infoCard}>
					<Text style={styles.name}>{name}</Text>
					<View style={styles.row}>
						<Ionicons name="location-sharp" size={16} color="#b0b8d1" />
						<Text style={styles.location}>{location}</Text>
					</View>
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={14} color="#FFD700" />
						<Text style={styles.rating}>{rating}</Text>
					</View>

					<Text style={styles.sectionTitle}>About this place</Text>
					<Text style={styles.body}>
						This is your detailed view. You can add more sections here like amenities,
						pricing, photos, contact information, and booking actions.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#05071A",
	},
	content: {
		padding: 18,
		paddingBottom: 36,
	},
	backButton: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 10,
		marginBottom: 10,
		borderRadius: 10,
		backgroundColor: "rgba(255,255,255,0.08)",
	},
	backText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		marginLeft: 4,
	},
	image: {
		width: "100%",
		height: 280,
		borderRadius: 18,
		marginBottom: 16,
	},
	infoCard: {
		backgroundColor: "#101427",
		borderRadius: 18,
		padding: 16,
	},
	name: {
		fontSize: 24,
		fontWeight: "800",
		color: "#fff",
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
		color: "#fff",
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: "#fff",
		marginBottom: 8,
	},
	body: {
		fontSize: 14,
		lineHeight: 21,
		color: "#c7cee3",
	},
});
