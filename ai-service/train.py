"""
FundChain AI Fraud Detector - Training & Validation Script
Validates model classification metrics against ground truth dataset.
"""

from dataset import DATASET
from model import AIFraudDetector

def run_evaluation():
    detector = AIFraudDetector()
    y_true = []
    y_pred = []

    print("==================================================")
    print("    FundChain AI Fraud Detection Evaluation      ")
    print("==================================================")

    for i, sample in enumerate(DATASET):
        res = detector.analyze_campaign(
            title=sample["title"],
            description=sample["description"],
            goal=sample["goal"],
            category=sample["category"],
            deadline_days=14
        )
        predicted_flag = 1 if res["riskScore"] >= 50 else 0
        y_true.append(sample["label"])
        y_pred.append(predicted_flag)

        status = "CORRECT" if predicted_flag == sample["label"] else "MISCLASSIFIED"
        print(f"[{status}] Sample #{i+1}: True={sample['label']} | Predicted Score={res['riskScore']}/100 ({res['riskLevel']}) | '{sample['title'][:40]}...'")

    # Compute metrics
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)

    accuracy = (tp + tn) / len(y_true)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

    print("--------------------------------------------------")
    print(f"Total Test Samples: {len(y_true)}")
    print(f"Accuracy : {accuracy * 100:.1f}%")
    print(f"Precision: {precision * 100:.1f}%")
    print(f"Recall   : {recall * 100:.1f}%")
    print(f"F1-Score : {f1 * 100:.1f}%")
    print("==================================================")

if __name__ == "__main__":
    run_evaluation()
