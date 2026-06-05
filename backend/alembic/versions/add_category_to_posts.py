"""add category to posts

Revision ID: add_category_to_posts
Revises: ef97d8577267
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa


revision = 'add_category_to_posts'
down_revision = 'ef97d8577267'


def upgrade():
    op.add_column('posts', sa.Column('category', sa.String(20), nullable=True))
    op.execute("UPDATE posts SET category = '创作' WHERE category IS NULL")
    op.alter_column('posts', 'category', nullable=False)
    op.create_index(op.f('ix_posts_category'), 'posts', ['category'])


def downgrade():
    op.drop_index(op.f('ix_posts_category'), table_name='posts')
    op.drop_column('posts', 'category')
