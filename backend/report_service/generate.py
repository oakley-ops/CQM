#!/usr/bin/env python3
"""
CQM Report Generator
Reads --type arg (session or management), reads JSON from stdin,
generates PDF via xhtml2pdf + Jinja2, writes PDF bytes to stdout.
"""

import sys
import json
import argparse
import io
from datetime import datetime

try:
    from jinja2 import Environment, FileSystemLoader
except ImportError:
    sys.stderr.write("ERROR: jinja2 not installed. Run: pip install jinja2\n")
    sys.exit(1)

try:
    from xhtml2pdf import pisa
except ImportError:
    sys.stderr.write("ERROR: xhtml2pdf not installed. Run: pip install xhtml2pdf\n")
    sys.exit(1)

import os

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), 'templates')


def render_template(template_name, context):
    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=False
    )
    template = env.get_template(template_name)
    return template.render(**context)


def html_to_pdf(html_string):
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(
        src=html_string,
        dest=pdf_buffer,
        encoding='utf-8'
    )
    if pisa_status.err:
        raise RuntimeError(f"xhtml2pdf error code: {pisa_status.err}")
    return pdf_buffer.getvalue()


def build_session_context(data):
    session = data.get('session', {})
    entries = data.get('entries', [])

    total_tests = len(entries)
    passed_tests = sum(1 for e in entries if e.get('pass_status') is True)
    failed_tests = sum(1 for e in entries if e.get('pass_status') is False)
    pass_rate = round((passed_tests / total_tests) * 100) if total_tests > 0 else 0

    # Generate document number
    session_number = session.get('session_number', 'N/A')
    document_number = f"CQM-{session_number}"

    # Group entries by category
    categories_map = {}
    for entry in entries:
        definition = entry.get('definition') or {}
        category = definition.get('category') or {}
        cat_name = category.get('category_name', 'Uncategorized')
        cat_code = category.get('category_code', '')
        cat_key = cat_name

        if cat_key not in categories_map:
            categories_map[cat_key] = {
                'name': cat_name,
                'code': cat_code,
                'entries': []
            }
        categories_map[cat_key]['entries'].append(entry)

    entries_by_category = list(categories_map.values())

    return {
        'session': session,
        'entries': entries,
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': failed_tests,
        'pass_rate': pass_rate,
        'document_number': document_number,
        'generated_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'),
        'entries_by_category': entries_by_category,
    }


def build_management_context(data):
    sessions = data.get('sessions', [])
    date_from = data.get('dateFrom', '')
    date_to = data.get('dateTo', '')

    total_sessions = len(sessions)
    total_tests = sum(s.get('totalTests', 0) for s in sessions)
    total_passed = sum(s.get('passedTests', 0) for s in sessions)
    overall_pass_rate = round((total_passed / total_tests) * 100) if total_tests > 0 else 0

    approved_count = sum(1 for s in sessions if s.get('status') == 'approved')
    submitted_count = sum(1 for s in sessions if s.get('status') == 'submitted')
    rejected_count = sum(1 for s in sessions if s.get('status') == 'rejected')
    draft_count = sum(1 for s in sessions if s.get('status') == 'draft')

    # Group by card type
    card_type_map = {}
    for s in sessions:
        ct = s.get('card_type', 'Unknown')
        if ct not in card_type_map:
            card_type_map[ct] = {'count': 0, 'tests': 0, 'passed': 0}
        card_type_map[ct]['count'] += 1
        card_type_map[ct]['tests'] += s.get('totalTests', 0)
        card_type_map[ct]['passed'] += s.get('passedTests', 0)

    by_card_type = []
    for ct, stats in card_type_map.items():
        stats['pass_rate'] = round((stats['passed'] / stats['tests']) * 100) if stats['tests'] > 0 else 0
        by_card_type.append((ct, stats))

    # Generate chart
    chart_base64 = None
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import base64

        if by_card_type:
            labels = [item[0] for item in by_card_type]
            pass_rates = [item[1]['pass_rate'] for item in by_card_type]

            fig, ax = plt.subplots(figsize=(8, 4))
            colors = ['#4caf50' if r >= 90 else '#ff9800' if r >= 70 else '#f44336' for r in pass_rates]
            bars = ax.bar(labels, pass_rates, color=colors, edgecolor='white', linewidth=0.5)
            ax.set_ylim(0, 110)
            ax.set_ylabel('Pass Rate (%)', fontsize=11)
            ax.set_title('Pass Rate by Card Type', fontsize=13, fontweight='bold')
            ax.axhline(y=90, color='#4caf50', linestyle='--', linewidth=1, alpha=0.7, label='Target (90%)')
            ax.legend(fontsize=9)
            for bar, rate in zip(bars, pass_rates):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height() + 1,
                        f'{rate}%', ha='center', va='bottom', fontsize=10, fontweight='bold')
            ax.set_facecolor('#fafafa')
            fig.patch.set_facecolor('white')
            plt.tight_layout()

            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=120, bbox_inches='tight')
            plt.close(fig)
            img_buffer.seek(0)
            chart_base64 = base64.b64encode(img_buffer.read()).decode('utf-8')
    except ImportError:
        pass  # matplotlib not available, skip chart
    except Exception as e:
        sys.stderr.write(f"Chart generation warning: {e}\n")

    return {
        'sessions': sessions,
        'total_sessions': total_sessions,
        'total_tests': total_tests,
        'total_passed': total_passed,
        'overall_pass_rate': overall_pass_rate,
        'approved_count': approved_count,
        'submitted_count': submitted_count,
        'rejected_count': rejected_count,
        'draft_count': draft_count,
        'by_card_type': by_card_type,
        'date_from': date_from,
        'date_to': date_to,
        'generated_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'),
        'chart_base64': chart_base64,
    }


def build_kpi_context(data):
    kpis = data.get('kpis', [])
    history = data.get('history', [])
    session_breakdown = data.get('sessionBreakdown', [])
    period_label = data.get('periodLabel', 'Last 6 Months')
    qual_session_count = data.get('qualSessionCount', 0)
    mon_session_count = data.get('monSessionCount', 0)

    # Compute display_value for each KPI
    for kpi in kpis:
        val = kpi.get('currentValue')
        unit = kpi.get('unit', '')
        if val is None:
            kpi['display_value'] = '—'
        elif unit == '%':
            kpi['display_value'] = f"{val}%"
        elif unit == 'days':
            kpi['display_value'] = f"{val}d"
        else:
            kpi['display_value'] = str(val)

    # Generate chart: current value vs target for each KPI
    chart_base64 = None
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import base64

        chartable = [k for k in kpis if k.get('currentValue') is not None and k.get('unit') == '%']
        if chartable:
            names = [k['kpiName'] for k in chartable]
            values = [k['currentValue'] for k in chartable]
            targets = [k['targetValue'] for k in chartable]
            statuses = [k.get('status', 'grey') for k in chartable]

            color_map = {'green': '#4caf50', 'yellow': '#ff9800', 'red': '#f44336', 'grey': '#9e9e9e'}
            colors = [color_map.get(s, '#9e9e9e') for s in statuses]

            x = range(len(names))
            fig, ax = plt.subplots(figsize=(9, 4))
            bars = ax.bar(x, values, color=colors, edgecolor='white', linewidth=0.5, label='Current')
            ax.scatter(x, targets, marker='D', color='#1565c0', zorder=5, s=60, label='Target')
            ax.set_xticks(list(x))
            ax.set_xticklabels(names, fontsize=9)
            ax.set_ylim(0, 110)
            ax.set_ylabel('Value (%)', fontsize=10)
            ax.set_title('KPI Current vs Target', fontsize=12, fontweight='bold')
            ax.legend(fontsize=9)
            for bar, val in zip(bars, values):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height() + 1,
                        f'{val}%', ha='center', va='bottom', fontsize=9, fontweight='bold')
            ax.set_facecolor('#fafafa')
            fig.patch.set_facecolor('white')
            plt.tight_layout()

            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=120, bbox_inches='tight')
            plt.close(fig)
            buf.seek(0)
            chart_base64 = base64.b64encode(buf.read()).decode('utf-8')
    except ImportError:
        pass
    except Exception as e:
        sys.stderr.write(f"KPI chart warning: {e}\n")

    return {
        'kpis': kpis,
        'history': history,
        'session_breakdown': session_breakdown,
        'rejection_causes': data.get('rejectionCauses', []),
        'period_label': period_label,
        'qual_session_count': qual_session_count,
        'mon_session_count': mon_session_count,
        'chart_base64': chart_base64,
        'generated_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'),
    }


def main():
    parser = argparse.ArgumentParser(description='Generate CQM PDF reports')
    parser.add_argument('--type', required=True, choices=['session', 'management', 'kpi'],
                        help='Report type: session, management, or kpi')
    args = parser.parse_args()

    # Read JSON from stdin
    raw = sys.stdin.buffer.read()
    try:
        data = json.loads(raw.decode('utf-8'))
    except json.JSONDecodeError as e:
        sys.stderr.write(f"ERROR: Invalid JSON input: {e}\n")
        sys.exit(1)

    # Build context
    if args.type == 'session':
        context = build_session_context(data)
        template_name = 'session_report.html'
    elif args.type == 'kpi':
        context = build_kpi_context(data)
        template_name = 'kpi_report.html'
    else:
        context = build_management_context(data)
        template_name = 'management_report.html'

    # Render HTML
    try:
        html = render_template(template_name, context)
    except Exception as e:
        sys.stderr.write(f"ERROR: Template rendering failed: {e}\n")
        sys.exit(1)

    # Convert to PDF
    try:
        pdf_bytes = html_to_pdf(html)
    except Exception as e:
        sys.stderr.write(f"ERROR: PDF generation failed: {e}\n")
        sys.exit(1)

    # Write PDF to stdout
    sys.stdout.buffer.write(pdf_bytes)


if __name__ == '__main__':
    main()
