import os
from datetime import datetime, timezone
from models import get_connection

class NotificationProvider:
    """Base class for all notification providers."""
    def send(self, recipient: str, message: str, alert_id: int):
        raise NotImplementedError

class SMSProvider(NotificationProvider):
    """Abstract SMS provider (Requirement 12)"""
    def send(self, recipient: str, message: str, alert_id: int):
        # Secure environment variables check
        api_key = os.environ.get("SMS_API_KEY")
        if not api_key:
            print(f"[SMSProvider] SMS NOT CONFIGURED. Cannot send SMS to {recipient}.")
            return {"status": "SMS NOT CONFIGURED"}
        
        # Simulated successful sending
        print(f"[SMSProvider] Sent SMS to {recipient}: {message}")
        return {"status": "SENT"}

class AppPushProvider(NotificationProvider):
    """Abstract Push Notification provider (Requirement 11)"""
    def send(self, recipient: str, message: str, alert_id: int):
        fcm_key = os.environ.get("FCM_SERVER_KEY")
        if not fcm_key:
            print(f"[AppPushProvider] PUSH NOT CONFIGURED. Cannot push to {recipient}.")
            return {"status": "NOT_CONFIGURED"}
        
        print(f"[AppPushProvider] Pushed to {recipient}: {message}")
        return {"status": "SENT"}


class AlertEngine:
    TRANSLATIONS = {
        "HI": {
            "RISK_ESCALATION": "चेतावनी: आपके क्षेत्र में भूस्खलन का खतरा बढ़ गया है। (Warning: Landslide risk escalated in your area.)",
            "SENSOR_THRESH": "हार्डवेयर सेंसर चेतावनी: महत्वपूर्ण स्तर पार हो गए हैं। (Sensor Alert: Critical levels crossed.)",
            "WEATHER_ALERT": "मौसम चेतावनी: भारी बारिश की संभावना। (Weather Alert: Heavy rainfall expected.)",
            "DEFAULT": "महत्वपूर्ण सूचना: कृपया सतर्क रहें। (Important: Please stay alert.)"
        }
    }

    @staticmethod
    def _get_translation(trigger_type: str, lang: str = "HI") -> str:
        lang_dict = AlertEngine.TRANSLATIONS.get(lang, AlertEngine.TRANSLATIONS["HI"])
        return lang_dict.get(trigger_type, lang_dict["DEFAULT"])

    @staticmethod
    def evaluate_and_trigger(location_id: int, old_level: str, new_level: str, score: int, lat: float, lon: float, trigger_type: str = "RISK_ESCALATION"):
        """Evaluate if an alert should be triggered based on risk change."""
        should_alert = False
        severity = new_level
        message = ""

        if old_level == "LOW" and new_level == "MODERATE":
            should_alert = True
            message = f"Risk escalated to MODERATE at location ID {location_id}."
        elif old_level in ["LOW", "MODERATE"] and new_level == "HIGH":
            should_alert = True
            message = f"URGENT: Risk escalated to HIGH at location ID {location_id}."
        elif new_level == "CRITICAL":
            should_alert = True
            message = f"CRITICAL WARNING: Imminent risk at location ID {location_id}."
            severity = "CRITICAL"

        if should_alert:
            AlertEngine.create_alert(location_id, severity, message, score, lat, lon, trigger_type)

    @staticmethod
    def create_alert(location_id: int, severity: str, message: str, score: int, lat: float, lon: float, trigger_type: str, lang: str = "HI"):
        conn = get_connection()
        try:
            # Append translated message
            translated_prefix = AlertEngine._get_translation(trigger_type, lang)
            multilingual_message = f"{translated_prefix}\n{message}"

            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alerts (location_id, severity, message, status, trigger_type, risk_score, latitude, longitude, recipient_type)
                VALUES (?, ?, ?, 'GENERATED', ?, ?, ?, ?, 'ALL')
            """, (location_id, severity, multilingual_message, trigger_type, score, lat, lon))
            alert_id = cursor.lastrowid
            
            # Dispatch to providers with multilingual message
            sms = SMSProvider().send("Authority", multilingual_message, alert_id)
            push = AppPushProvider().send("Community", multilingual_message, alert_id)

            # Update status based on providers
            final_status = "SENT"
            if sms.get("status") == "SMS NOT CONFIGURED" and push.get("status") == "NOT_CONFIGURED":
                final_status = "NOT_CONFIGURED"

            cursor.execute("UPDATE alerts SET status = ? WHERE id = ?", (final_status, alert_id))
            conn.commit()
            print(f"[AlertEngine] Alert {alert_id} generated. Final status: {final_status}")
        except Exception as e:
            print(f"[AlertEngine] Error creating alert: {e}")
        finally:
            conn.close()

