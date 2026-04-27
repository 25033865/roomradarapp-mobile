import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ProfileScreen() {
	const router = useRouter();

	const handleBottomNavPress = (key: string) => {
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
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor="#05071A" />

			<View style={styles.header}>
				<Text style={styles.title}>Profile</Text>
				<Text style={styles.subtitle}>Manage your account details here</Text>
			</View>

			<View style={styles.emptyState}>
				<Ionicons name="person-circle-outline" size={58} color="#8f91aa" />
				<Text style={styles.emptyTitle}>Profile coming soon</Text>
				<Text style={styles.emptySubtitle}>
					Your personal details and settings will appear in this tab.
				</Text>
			</View>

			<View style={styles.bottomNav}>
				{[
					{ key: "home", icon: "home-outline" as const },
					{ key: "history", icon: "time-outline" as const },
					{ key: "favorites", icon: "heart-outline" as const },
					{ key: "profile", icon: "person-outline" as const },
				].map((item) => {
					const isActive = item.key === "profile";
					return (
						<TouchableOpacity
							key={item.key}
							style={styles.navItem}
							onPress={() => handleBottomNavPress(item.key)}
							activeOpacity={0.7}
						>
							<Ionicons
								name={isActive ? "person" : item.icon}
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
	bottomNav: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		backgroundColor: "#fff",
		paddingVertical: 12,
		paddingBottom: 20,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.06,
		shadowRadius: 12,
		elevation: 10,
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
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
