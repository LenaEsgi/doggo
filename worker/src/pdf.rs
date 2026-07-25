// worker/src/pdf.rs
use printpdf::*;
use crate::model::MissionReportRequest;

const FONT_BYTES: &[u8] = include_bytes!("../assets/DejaVuSans.ttf");

pub fn build(request: &MissionReportRequest) -> Vec<u8> {
    let font = ParsedFont::from_bytes(FONT_BYTES, 0, &mut Vec::new()).expect("embedded font must parse");
    let mut doc = PdfDocument::new(&format!("Rapport de mission - {}", request.mission_name));
    let font_id = doc.add_font(&font);

    let mut ops = vec![Op::StartTextSection];
    let mut y = 270.0;

    ops.push(Op::SetTextCursor { pos: Point { x: Mm(20.0).into(), y: Mm(y).into() } });
    ops.push(Op::SetFont { font: PdfFontHandle::External(font_id.clone()), size: Pt(18.0) });
    ops.push(Op::ShowText { items: vec![TextItem::Text(request.mission_name.clone())] });

    let fields = [
        ("Robot", request.robot_dog_name.clone()),
        ("Statut", request.status.clone()),
        ("Début", request.started_at.clone()),
        ("Fin", request.ended_at.clone().unwrap_or_else(|| "-".to_string())),
    ];

    for (label, value) in fields {
        y -= 8.0;
        ops.push(Op::SetTextCursor { pos: Point { x: Mm(20.0).into(), y: Mm(y).into() } });
        ops.push(Op::SetFont { font: PdfFontHandle::External(font_id.clone()), size: Pt(11.0) });
        ops.push(Op::ShowText { items: vec![TextItem::Text(format!("{label}: {value}"))] });
    }

    y -= 10.0;
    ops.push(Op::SetTextCursor { pos: Point { x: Mm(20.0).into(), y: Mm(y).into() } });
    ops.push(Op::ShowText { items: vec![TextItem::Text("Étapes:".to_string())] });

    for step in &request.steps {
        y -= 6.0;
        ops.push(Op::SetTextCursor { pos: Point { x: Mm(25.0).into(), y: Mm(y).into() } });
        ops.push(Op::ShowText {
            items: vec![TextItem::Text(format!("{}. {} — {}", step.order, step.name, step.status))],
        });
    }

    ops.push(Op::EndTextSection);

    let page = PdfPage::new(Mm(210.0), Mm(297.0), ops);
    doc.with_pages(vec![page]).save(&PdfSaveOptions::default(), &mut Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{MissionReportRequest, MissionReportStep};

    fn sample_request() -> MissionReportRequest {
        MissionReportRequest {
            mission_run_id: "run-1".into(),
            mission_name: "Patrouille".into(),
            robot_dog_name: "Rex".into(),
            status: "SUCCESS".into(),
            started_at: "2026-07-25T10:00:00.000Z".into(),
            ended_at: Some("2026-07-25T10:15:00.000Z".into()),
            steps: vec![MissionReportStep { name: "Avancer".into(), status: "COMPLETED".into(), order: 1 }],
        }
    }

    #[test]
    fn produces_non_empty_pdf_bytes() {
        let bytes = build(&sample_request());
        assert!(!bytes.is_empty());
        assert_eq!(&bytes[0..4], b"%PDF");
    }
}
